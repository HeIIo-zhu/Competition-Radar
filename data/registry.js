/* 内置赛事官网库：导入外部名单时，匹配不到南信大目录的赛事先查这里。
   来源：2026-11-28 联网查证各赛事主办方官网；仅收录真实可访问的官方地址。
   字段 VENUES: {赛事名: 官网}，SCHOOL 为将来「换学校」预留，本期不启用。 */
const REGISTRY = {
  SCHOOL: {
    name: "南京信息工程大学",
    short: "南信",
    catalogTitle: "学生创新创业竞赛目录",
    noticeColumns: []
  },
  VENUES: {
  "中国国际大学生创新大赛": "https://cy.ncss.cn/",
  "\"挑战杯\"全国大学生课外学术科技作品竞赛": "https://www.tiaozhanbei.net/",
  "\"挑战杯\"中国大学生创业计划大赛": "https://www.tiaozhanbei.net/",
  "全国大学生职业规划大赛": "https://zgs.chsi.com.cn/",
  "全国大学生创新年会": "https://www.gjcxcy.cn/",
  "\"外研社·国才杯\"全国大学生外语能力大赛": "https://ucc.fltrp.com/",
  "\"中国软件杯\"大学生软件设计大赛": "https://www.cnsoftbei.com/",
  "ICPC国际大学生程序设计竞赛": "https://icpc.global/",
  "全国大学生电子设计竞赛": "http://nuedc.xjtu.edu.cn/",
  "全国大学生集成电路创新创业大赛": "http://univ.ciciec.com/",
  "全国大学生节能减排社会实践与科技竞赛": "https://www.jienengjianpai.org/",
  "全国大学生嵌入式芯片与系统设计竞赛": "http://devise.socchina.net/home",
  "蓝桥杯全国大学生软件和信息技术大赛": "https://dasai.lanqiao.cn/",
  "全国大学生数学建模竞赛": "https://www.mcm.edu.cn/",
  "全国大学生数学竞赛": "http://cmathc.cn/",
  "全国大学生计算机设计大赛": "https://jsjds.blcu.edu.cn/",
  "全国大学生智能汽车竞赛": "http://www.smartcarrace.com/",
  "中国大学生计算机设计大赛": "https://jsjds.blcu.edu.cn/",
  "全国大学生机器人大赛": "http://www.cnrobocon.net/",
  "全国大学生物联网设计竞赛": "http://iot.sjtu.edu.cn/",
  "全国大学生服务外包创新创业大赛": "https://www.fwwb.org.cn/",
  "中国国际\"互联网+\"大学生创新创业大赛": "https://cy.ncss.cn/",
  "全国大学生市场调查与分析大赛": "http://www.china-cssc.org/",
  "全国大学生广告艺术大赛": "https://www.sun-ada.net/",
  "全国大学生物流设计大赛": "http://dspt.clppx.org.cn/pkIndex/wlsj/wlsjdshome",
  "全国周培源大学生力学竞赛": "http://zpy.cstam.org.cn/",
  "全国大学生物理实验竞赛": "https://wlsycx.moocollege.com/",
  "全国大学生水利创新设计大赛": "http://sljzw.hhu.edu.cn/",
  "全国大学生信息安全竞赛": "http://www.ciscn.cn/",
  "全国大学生英语竞赛": "https://www.chinaneccs.cn/",
  "全国大学生艺术展演活动": "https://www.moe.gov.cn/",
  "全国高校数字艺术设计大赛": "https://www.ncda.org.cn/",
  "中国研究生数学建模竞赛": "https://cpipc.acge.org.cn/",
  "中国研究生电子设计竞赛": "https://cpipc.acge.org.cn/cw/hp/6",
  "中国研究生机器人创新设计大赛": "https://cpipc.acge.org.cn/",
  "全国大学生GIS应用技能大赛": "https://www.cagis.org.cn/",
  "全国大学生测绘学科创新创业智能大赛": "https://smt.whu.edu.cn/sshd/dxscxcyznds.htm",
  "全国大学生金相技能大赛": "https://www.jxds.tech/",
  "全国大学生生命科学竞赛": "https://www.culsc.cn/",
  "\"学创杯\"全国大学生创业综合模拟大赛": "http://www.xcbds.com/"
}
};
window.REGISTRY = REGISTRY;
