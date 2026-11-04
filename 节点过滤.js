/*
# @ScriptName        Loon (Sub-Store) 节点过滤与重命名精简版
# @Function          自动过滤无效节点，识别并重命名国家地区，支持前后缀与防重名
*/

function operator(proxies) {
    const prefix = "", suffix = ""; 
    const isEN = false; // false 为中文 (🇺🇸美国)，true 为英文 (🇺🇸US)

    // 1. 垃圾节点过滤正则（将原数组合并，极大提升性能与精简度）
    const dropRegex = /广告|过期|无效|测试|备用|官网|账号|有效期|群|到期|刷新|剩余|电报|会员|解锁|流量|超时|订阅|佣金|免翻|节点|下载|更新|点外|重置|免流|Days|Date|Expire|Premium|建议|免费|套餐|版本|已用|失联|官方|网址|TEST|客服|网站|获取|机场|下次|官址|联系|邮箱|工单|学术|USE|USED|TOTAL|EMAIL/i;

    // 2. 功能性保留词映射
    const keepMap = { "ChatGPT": "GPT" };

    // 3. 核心地区映射字典（剔除了极罕见冷门国家，保留主流）
    const regions = {
        "美国|US|洛杉矶|西雅图|纽约|芝加哥|Atlanta": isEN ? "🇺🇸US" : "🇺🇸美国",
        "港|香港|HK|Hong Kong": isEN ? "🇭🇰HK" : "🇭🇰香港",
        "新加坡|狮城|SG|Singapore": isEN ? "🇸🇬SG" : "🇸🇬新加坡",
        "台|台湾|台北|高雄|TW|Taiwan": isEN ? "🇨🇳TW" : "🇨🇳台湾",
        "日|东京|大阪|名古屋|JP|Tokyo|Japan": isEN ? "🇯🇵JP" : "🇯🇵日本",
        "韩国|首尔|釜山|KR|Korea|Seoul": isEN ? "🇰🇷KR" : "🇰🇷韩国",
        "英国|伦敦|曼彻斯特|GB|UK|United Kingdom": isEN ? "🇬🇧GB" : "🇬🇧英国",
        "德国|法兰克福|柏林|DE|Germany|Frankfurt": isEN ? "🇩🇪DE" : "🇩🇪德国",
        "法国|巴黎|马赛|FR|France|Paris": isEN ? "🇫🇷FRA" : "🇫🇷法国",
        "澳|悉尼|墨尔本|AU|Australia|Sydney": isEN ? "🇦🇺AU" : "🇦🇺澳大利亚",
        "加拿大|多伦多|温哥华|CA|Canada|Toronto": isEN ? "🇨🇦CA" : "🇨🇦加拿大",
        "印度|孟买|IN|India|Mumbai": isEN ? "🇮🇳IN" : "🇮🇳印度",
        "荷兰|阿姆斯特丹|NL|Netherlands": isEN ? "🇳🇱NL" : "🇳🇱荷兰",
        "俄罗斯|莫斯科|RU|Russia|Moscow": isEN ? "🇷🇺RU" : "🇷🇺俄罗斯",
        "土耳其|伊斯坦布尔|TR|Turkey": isEN ? "🇹🇷TR" : "🇹🇷土耳其",
        "瑞士|苏黎世|CH|Switzerland": isEN ? "🇨🇭CH" : "🇨🇭瑞士",
        "瑞典|斯德哥尔摩|SE|Sweden": isEN ? "🇸🇪SE" : "🇸🇪瑞典",
        "阿根廷|AR|Argentina": isEN ? "🇦🇷AR" : "🇦🇷阿根廷",
        "巴西|圣保罗|BR|Brazil": isEN ? "🇧🇷BR" : "🇧🇷巴西",
        "菲律宾|马尼拉|PH|Philippines": isEN ? "🇵🇭PH" : "🇵🇭菲律宾",
        "泰国|曼谷|TH|Thailand": isEN ? "🇹🇭TH" : "🇹🇭泰国",
        "越南|河内|VN|Vietnam": isEN ? "🇻🇳VN" : "🇻🇳越南",
        "马来西亚|吉隆坡|MY|Malaysia": isEN ? "🇲🇾MY" : "🇲🇾马来西亚"
    };

    let nameMap = {};

    return proxies.filter(p => {
        // 命中垃圾关键词直接丢弃
        if (dropRegex.test(p.name)) return false; 

        let name = p.name, kept = [];
        
        // 提取并移除保留词
        for (let k in keepMap) {
            if (new RegExp(k, 'i').test(name)) {
                kept.push(keepMap[k]);
                name = name.replace(new RegExp(k, 'ig'), '');
            }
        }

        // 匹配地区并重命名
        for (let r in regions) {
            if (new RegExp(r, 'i').test(name)) {
                name = regions[r]; 
                break;
            }
        }

        // 拼接前缀与去重叠加逻辑
        name = prefix + name;
        nameMap[name] = (nameMap[name] || 0) + 1;
        if (nameMap[name] > 1) name += `-${nameMap[name]}`;
        
        // 拼接后缀与保留词并覆写节点名称
        p.name = name + suffix + (kept.length ? ' ' + kept.join(' ') : '');
        return true;
    });
}
