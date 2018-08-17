const {
    ccclass,
    property
} = cc._decorator;
@ccclass
export default class GameRankingList extends cc.Component {
    @property(cc.Prefab)
    prefabRankItem = null;
    @property(cc.Prefab)
    prefabGameOverRank = null;

    //列表相关
    @property(cc.Node)
    node_list = null;
    @property(cc.Node)
    scrollViewContent = null;
    @property(cc.Node) //群排行标题
    ziti_qunpaihang = null;
    @property(cc.Node) //好友排行标题
    ziti_haoyoupaihang = null;
    @property(cc.Node) //只是为了确定主域中对应按钮的位置
    ziti_chakanqun = null;
    @property(cc.Node) //列表中自己的数据
    node_myself = null;

    //结束界面
    @property(cc.Node)
    overNode = null;
    @property(cc.Node)
    gameOverRankLayout = null;
    @property(cc.Node)
    ziti_chakanhaoyou = null;

    //超越好友
    @property(cc.Node)
    beyondFriendNode = null;
    @property(cc.Node)
    headImageNode = null;
    @property(cc.Label)
    nameLabel = null;
    @property(cc.Label)
    scoreLabe = null;

    @property(cc.Node)
    loadingLabel = null; //加载文字

    waitingForBeyondFriends = null;

    onLoad() {
        console.log("---微信子域 onLoad ---");
        this.ziti_chakanqun.active = false;
        this.ziti_chakanhaoyou.active = false;

        this.node_list.active = false;
        this.overNode.active = false;
        this.beyondFriendNode.active = false;
        this.loadingLabel.active = false;
    }

    start() {
        console.log("--- start ---");

        window.wx.onMessage(data => {
            console.log("-- 接收主域发来消息：--");
            console.log(data);
            if (data.messageType == 0) { //移除排行榜
                this.showPanel(null);
            } else if (data.messageType == 1) { //获取好友排行榜
                this.showPanel("friend");
                this.fetchFriendData(data.MAIN_MENU_NUM);
            } else if (data.messageType == 2) { //提交得分
                this.submitScore(data.MAIN_MENU_NUM, data.myScore);
            } else if (data.messageType == 3) { //获取好友排行榜横向排列展示模式
                this.showPanel("end");
                this.gameOverRank(data.MAIN_MENU_NUM);
            } else if (data.messageType == 5) { //获取群排行榜
                this.showPanel("group");
                this.fetchGroupFriendData(data.MAIN_MENU_NUM, data.shareTicket);
            } else if (data.messageType == 6) { //用于游戏内的超越功能的数据源获取
                this.showPanel(null);
                this.fetchFriendDataToBeyond(data.MAIN_MENU_NUM);
            } else if (data.messageType == 7) { //用于查询给的分数是否超过当前数据源中的分数，超过谁就显示谁，然后删除掉
                this.isBeyond(data.myScore);
            } else if (data.messageType == 8) { //显示下个即将超越的好友
                this.showPanel("beyond");
                this.nextBeyond(data.myScore);
            }
        });

    }

    showPanel(panelName) {
        console.log("-- 子域 showPanel --" + panelName);
        if (panelName == "end") {
            this.node_list.active = false;
            this.overNode.active = true;
            this.beyondFriendNode.active = false;
            this.loadingLabel.active = true;

            this.gameOverRankLayout.active = false;
        } else if (panelName == "friend") {
            this.node_list.active = true;
            this.node_myself.active = false;
            this.overNode.active = false;
            this.beyondFriendNode.active = false;
            this.loadingLabel.active = true;

            this.scrollViewContent.active = false;
        } else if (panelName == "group") {
            this.node_list.active = true;
            this.node_myself.active = false;
            this.overNode.active = false;
            this.beyondFriendNode.active = false;
            this.loadingLabel.active = true;

            this.scrollViewContent.active = false;
        } else if (panelName == "beyond") {
            this.node_list.active = false;
            this.overNode.active = false;
            this.beyondFriendNode.active = true;
            this.loadingLabel.active = false;
        } else {
            this.node_list.active = false;
            this.overNode.active = false;
            this.beyondFriendNode.active = false;
            this.loadingLabel.active = false;
        }
    }

    //提交得分
    submitScore(MAIN_MENU_NUM, score) {
        if (CC_WECHATGAME) {
            window.wx.getUserCloudStorage({
                // 以key/value形式存储
                keyList: [MAIN_MENU_NUM],
                success(getres) {
                    console.log("--- 提交分数 getUserCloudStorage success ---");
                    if (getres.KVDataList.length != 0) {
                        if (getres.KVDataList[0].value > score) { //这里比较了是否超过了服务器的数据，若没超过则不上传
                            return;
                        }
                    }
                    // 对用户托管数据进行写数据操作
                    window.wx.setUserCloudStorage({
                        KVDataList: [{
                            key: MAIN_MENU_NUM,
                            value: "" + score
                        }],
                        success(res) {
                            //console.log('setUserCloudStorage', 'success', res)
                        },
                        fail(res) {
                            // console.log('setUserCloudStorage', 'fail')
                        },
                        complete(res) {
                            //  console.log('setUserCloudStorage', 'ok')
                        }
                    });
                },
                fail(res) {
                    // console.log('getUserCloudStorage', 'fail')
                },
                complete(res) {
                    // console.log('getUserCloudStorage', 'ok')
                }
            });
        } else {
            //  cc.log("提交得分:" + MAIN_MENU_NUM + " : " + score)
        }
    }

    //游戏结束界面显示最近两人
    gameOverRank(MAIN_MENU_NUM) {
        let self = this;
        if (CC_WECHATGAME) {
            wx.getUserInfo({
                openIdList: ['selfOpenId'],
                success: (userRes) => {
                    //    cc.log('success', userRes.data)
                    let userData = userRes.data[0];
                    //取出所有好友数据
                    wx.getFriendCloudStorage({
                        keyList: [MAIN_MENU_NUM],
                        success: res => {
                            console.log("--- gameOverRank success ---");
                            console.log(res);
                            self.loadingLabel.active = false;
                            self.gameOverRankLayout.active = true;

                            let data = res.data;
                            data.sort((a, b) => {
                                if (a.KVDataList.length == 0 && b.KVDataList.length == 0) {
                                    return 0;
                                }
                                if (a.KVDataList.length == 0) {
                                    return 1;
                                }
                                if (b.KVDataList.length == 0) {
                                    return -1;
                                }
                                return b.KVDataList[0].value - a.KVDataList[0].value;
                            });

                            let fristShowIdx = 0;
                            let myIdx = "null";
                            for (let i = 0; i < data.length; i++) {
                                if (data[i].avatarUrl == userData.avatarUrl) {
                                    myIdx = i;
                                    if (i - 1 > 0 && i + 1 > data.length)
                                        fristShowIdx = i - 1;
                                    else if (i - 1 < 0)
                                        fristShowIdx = i;
                                    else if (i + 1 >= data.length) {
                                        if (i - 2 > 0)
                                            fristShowIdx = i - 2;
                                        else
                                            fristShowIdx = i - 1;
                                    }
                                }
                            }
                            console.log("-- fristShowIdx : " + fristShowIdx + " -- " + myIdx);

                            for (let i = 0; i < self.gameOverRankLayout.children.length; ++i) {
                                let nodeN = self.gameOverRankLayout.children[i];
                                if (myIdx != "null" && fristShowIdx + i < data.length) {
                                    nodeN.active = true;
                                    nodeN.getComponent('GameOverRank').init(fristShowIdx + i, data[fristShowIdx + i], fristShowIdx + i == myIdx);
                                } else
                                    nodeN.active = false;
                            }
                        },
                        fail: res => {
                            // console.log("wx.getFriendCloudStorage fail", res);
                            self.loadingLabel.getComponent(cc.Label).string = "数据加载失败，请检测网络，谢谢。";
                        }
                    });
                },
                fail: (res) => {
                    self.loadingLabel.getComponent(cc.Label).string = "数据加载失败，请检测网络，谢谢。";
                }
            });
        }
    }

    //好友排行列表
    fetchFriendData(MAIN_MENU_NUM) {
        let self = this;
        if (CC_WECHATGAME) {
            wx.getUserInfo({
                openIdList: ['selfOpenId'],
                success: (userRes) => {
                    let userData = userRes.data[0];
                    //取出所有好友数据
                    wx.getFriendCloudStorage({
                        keyList: [MAIN_MENU_NUM],
                        success: res => {
                            console.log("--- fetchFriendData success ---");
                            console.log(res);
                            self.loadingLabel.active = false;
                            self.node_list.active = true;
                            self.scrollViewContent.active = true;

                            let data = res.data;
                            data.sort((a, b) => {
                                if (a.KVDataList.length == 0 && b.KVDataList.length == 0) {
                                    return 0;
                                }
                                if (a.KVDataList.length == 0) {
                                    return 1;
                                }
                                if (b.KVDataList.length == 0) {
                                    return -1;
                                }
                                return b.KVDataList[0].value - a.KVDataList[0].value;
                            });
                            for (let i = 0; i < self.scrollViewContent.children.length; ++i) {
                                let nodeN = self.scrollViewContent.children[i];
                                if (i < data.length) {
                                    nodeN.active = true;
                                    nodeN.getComponent('RankItem').init(i, data[i]);
                                    if (data[i].avatarUrl == userData.avatarUrl) {
                                        self.node_myself.active = true;
                                        self.node_myself.getComponent('RankItem').init(i, data[i]);
                                    }
                                } else
                                    nodeN.active = false;
                            }
                        },
                        fail: res => {
                            //  console.log("wx.getFriendCloudStorage fail", res);
                            self.loadingLabel.getComponent(cc.Label).string = "数据加载失败，请检测网络，谢谢。";
                        }
                    });
                },
                fail: (res) => {
                    self.loadingLabel.getComponent(cc.Label).string = "数据加载失败，请检测网络，谢谢。";
                }
            });
        }
    }

    //群排行列表
    fetchGroupFriendData(MAIN_MENU_NUM, shareTicket) {
        let self = this;
        if (CC_WECHATGAME) {
            wx.getUserInfo({
                openIdList: ['selfOpenId'],
                success: (userRes) => {
                    //  console.log('success', userRes.data)
                    let userData = userRes.data[0];
                    //取出所有好友数据
                    wx.getGroupCloudStorage({
                        shareTicket: shareTicket,
                        keyList: [MAIN_MENU_NUM],
                        success: res => {
                            console.log("--- fetchGroupFriendData success ---");
                            self.loadingLabel.active = false;
                            self.node_list.active = true;
                            self.scrollViewContent.active = true;

                            let data = res.data;
                            data.sort((a, b) => {
                                if (a.KVDataList.length == 0 && b.KVDataList.length == 0) {
                                    return 0;
                                }
                                if (a.KVDataList.length == 0) {
                                    return 1;
                                }
                                if (b.KVDataList.length == 0) {
                                    return -1;
                                }
                                return b.KVDataList[0].value - a.KVDataList[0].value;
                            });
                            for (let i = 0; i < self.scrollViewContent.children.length; ++i) {
                                let nodeN = self.scrollViewContent.children[i];
                                if (i < data.length) {
                                    nodeN.active = true;
                                    nodeN.getComponent('RankItem').init(i, data[i]);
                                    if (data[i].avatarUrl == userData.avatarUrl) {
                                        self.node_myself.active = true;
                                        self.node_myself.getComponent('RankItem').init(i, data[i]);
                                    }
                                } else
                                    nodeN.active = false;
                            }
                        },
                        fail: res => {
                            // console.log("wx.getFriendCloudStorage fail", res);
                            self.loadingLabel.getComponent(cc.Label).string = "数据加载失败，请检测网络，谢谢。";
                        }
                    });
                },
                fail: (res) => {
                    self.loadingLabel.getComponent(cc.Label).string = "数据加载失败，请检测网络，谢谢。";
                }
            });
        }
    }

    //获取超越时数据
    fetchFriendDataToBeyond(MAIN_MENU_NUM) {
        let self = this;
        if (CC_WECHATGAME) {
            wx.getUserInfo({
                openIdList: ['selfOpenId'],
                success: (userRes) => {
                    //console.log('超越部分：success', userRes.data)
                    let userData = userRes.data[0];
                    //取出所有好友数据
                    wx.getFriendCloudStorage({
                        keyList: [MAIN_MENU_NUM],
                        success: res => {
                            console.log("--- fetchFriendDataToBeyond success ---");
                            console.log(res);
                            let data = res.data;
                            data.sort((a, b) => {
                                if (a.KVDataList.length == 0 && b.KVDataList.length == 0) {
                                    return 0;
                                }
                                if (a.KVDataList.length == 0) {
                                    return 1;
                                }
                                if (b.KVDataList.length == 0) {
                                    return -1;
                                }
                                return b.KVDataList[0].value - a.KVDataList[0].value;
                            });
                            let waitingForDelete = 0;
                            for (let i = 0; i < data.length; i++) {
                                if (data[i].avatarUrl == userData.avatarUrl) { //这是自己，要从待超集合中删除
                                    waitingForDelete = i;
                                }
                            }

                            data.splice(waitingForDelete, 1);
                            self.waitingForBeyondFriends = data;
                            //console.log("这里 这里！");
                            // for (let j = 0; j < self.waitingForBeyondFriends.length; j++) {
                            //     console.log(self.waitingForBeyondFriends[j]);
                            // }

                        },
                        fail: res => {
                            //console.log("wx.getFriendCloudStorage fail", res);
                            self.loadingLabel.getComponent(cc.Label).string = "数据加载失败，请检测网络，谢谢。";
                        }
                    });
                },
                fail: (res) => {
                    self.loadingLabel.getComponent(cc.Label).string = "数据加载失败，请检测网络，谢谢。";
                }
            });
        }
    }

    //是否超越
    isBeyond(currentScore) {
        if (this.waitingForBeyondFriends == null || this.waitingForBeyondFriends.length == 0) {
            return;
        }
        //  console.log(this.waitingForBeyondFriends.length);
        //  console.log("看下待超越的数据组");
        // for (let j = 0; j < this.waitingForBeyondFriends.length; j++) {
        //     console.log(this.waitingForBeyondFriends[j]);
        // }


        let beyondIndex = -1;
        for (let i = this.waitingForBeyondFriends.length - 1; i >= 0; i--) { //这个数据源是已经排好序的，但是是倒序从大到小
            let otherScore = this.waitingForBeyondFriends[i].KVDataList.length != 0 ? this.waitingForBeyondFriends[i].KVDataList[0].value : 0;
            if (currentScore > otherScore) {
                beyondIndex = i;
                break;
            }
        }
        if (beyondIndex != -1) {
            this.beyondFriendNode.active = true;
            //splice 返回的是一个数组。一定要加索引来访问
            let beyondData = this.waitingForBeyondFriends.splice(beyondIndex, 1);
            // console.log("看下超越的玩家数据");
            // console.log(beyondData[0]);

            this.initSprite(beyondData[0]);
        }
    }

    //下一个超越的是那一个
    nextBeyond(currentScore) {
        if (this.waitingForBeyondFriends == null || this.waitingForBeyondFriends.length == 0) {
            this.beyondFriendNode.active = false;
            console.log("-- nextBeyond 无 --");
            return;
        }
        //  console.log(this.waitingForBeyondFriends.length);
        //  console.log("看下待超越的数据组");
        // for (let j = 0; j < this.waitingForBeyondFriends.length; j++) {
        //     console.log(this.waitingForBeyondFriends[j]);
        // }


        let nextBeyondIndex = -1;
        for (let i = this.waitingForBeyondFriends.length - 1; i >= 0; i--) { //这个数据源是已经排好序的，但是是倒序从大到小
            let otherScore = this.waitingForBeyondFriends[i].KVDataList.length != 0 ? this.waitingForBeyondFriends[i].KVDataList[0].value : 0;
            if (currentScore < otherScore) {
                nextBeyondIndex = i;
                break;
            }
        }

        //console.log("看下传到子域的当前得分！--》 " + currentScore);
        if (nextBeyondIndex != -1) {
            this.beyondFriendNode.active = true;
            //splice 返回的是一个数组。一定要加索引来访问
            //let beyondData = this.waitingForBeyondFriends.splice(beyondIndex, 1);
            // console.log("看下超越的玩家数据");
            // console.log(beyondData[0]);

            this.initSprite(this.waitingForBeyondFriends[nextBeyondIndex]);
            this.nameLabel.string = this.waitingForBeyondFriends[nextBeyondIndex].nickname;
            this.scoreLabel.string = this.waitingForBeyondFriends[nextBeyondIndex].KVDataList[0].value;
        } else {
            // console.log("执行到这里，隐藏了下个好友！");
            this.beyondFriendNode.active = false;
        }

    }

    initSprite(beyondData) {
        let avatarUrl = beyondData.avatarUrl;
        //  console.log("看下 头像 URL");
        //  console.log(avatarUrl);
        //  console.log(this.headImageNode);
        //  console.log(this.headImageNode.getComponent(cc.Animation));
        this.createImage(avatarUrl);
        // let anim = this.headImageNode.getComponent(cc.Animation);
        //anim.play();
        // this.headImageNode.runAction(cc.moveTo(5.0,cc.v2(200,200)));
    }

    createImage(avatarUrl) {
        let self = this;
        try {
            let image = wx.createImage();
            image.onload = () => {
                try {
                    let texture = new cc.Texture2D();
                    texture.initWithElement(image);
                    texture.handleLoadedTexture();
                    self.headImageNode.getComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(texture);
                } catch (e) {
                    // cc.log(e);
                    self.headImageNode.active = false;
                }
            };
            image.src = avatarUrl;
        } catch (e) {
            // cc.log(e);
            self.headImageNode.active = false;
        }
    }
}