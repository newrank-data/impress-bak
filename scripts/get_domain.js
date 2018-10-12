require('dotenv').config();
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = process.env.MONGODB_URI;

module.exports = function (domain, callback) {

  try {
    const ref = JSON.parse(fs.readFileSync('public/ref.json'));

    try {
      MongoClient.connect(MONGODB_URI, (err, db) => {

        // 从 subdomains 表获取该主域名下的子域名及其记录数，计算记录数平均值
        const cursor = db.collection('subdomains').find({domain: domain}, {_id: 0});
        cursor.toArray((err, docs) => {
          if (docs.length) {
            let subdomains = docs.map(doc => {
              return {
                subdomain: doc.subdomain,
                record: doc.records.reduce((acc, cv) => acc + cv, 0) / doc.records.length
              }
            });

            // 从 alexa 表获取该主域名的详细数据
            const cursor = db.collection('alexa').find({domain: domain}, {_id: 0, details: 1});
            cursor.nextObject((err, doc) => {
              const domainPV = doc.details.traffic_data.three_month.avg_daily_pv;
              const subdomainsData = doc.details.subdomains_data;

              // 匹配子域名的 pv 并使用参考数据计算相对链接数，得出该子域名下单篇的影响力
              subdomains.forEach(sub => {
                for (let i = 0; i < subdomainsData.length; i++) {
                  const data = subdomainsData[i];
                  if (sub.subdomain == data.subdomain) {
                    sub.percentage = parseFloat((parseFloat(data.pageviews_percentage) * 0.01).toFixed(6));
                    sub.pv = Math.round(sub.percentage * domainPV);
                    sub.dieoff = Math.log(Math.pow(sub.record, 2)) / ref.dieoff;
                    sub.factor = Math.round(ref.factor * sub.dieoff);
                    sub.link = Math.round(sub.record / sub.factor);
                    sub.impress = sub.link < 3 ? 0 : Math.round((sub.pv * 0.2) / (sub.link * 0.8 ));
                    break;
                  }
                }
              });

              // 过滤 link 小于 3 的子域名
              subdomains = subdomains.filter(sub => sub.link >= 3);

              if (subdomains.length) {
                // 计算适用于其他子域名的最小值
                const domainMinImpress = Math.min.apply({}, subdomains.map(sub => sub.impress));
  
                // 计算用于主域名的值，如果子域名中不包含主域名，按照 PV 权重计算所有子域名的综合值
                const subdomainsPV = subdomains.reduce((acc, cv) => acc + cv.pv, 0);
                let sameIndex = -1;
                subdomains.forEach((sub, idx) => {
                  if (sub.subdomain == domain) {
                    sameIndex = idx;
                  }
                });
                const domainImpress = sameIndex == -1
                ? Math.round(subdomains.reduce((acc, cv) => {
                  return acc + cv.impress * (cv.pv / subdomainsPV);
                }, 0))
                : subdomains[sameIndex].impress;
  
                const reply = {
                  domain: domain,
                  pv: domainPV,
                  impress: domainImpress,
                  minImpress: domainMinImpress,
                  subdomains: subdomains
                };
  
                db.close();
                callback({
                  status: 200,
                  data: reply
                })
                
              } else {
                db.close();
                callback({
                  status: 404,
                  msg: '此域名在 subdomains 中无有效记录'
                });
              }
            });
            
          } else {
            db.close();
            callback({
              status: 404,
              msg: '此域名在 subdomains 中无记录'
            });
          }
        });
      });
  
    } catch (err) {
      callback({
        status: 500,
        msg: err.toString()
      });
    }

  } catch (err) {
    callback({
      status: 500,
      msg: '获取参考数据失败'
    });
  }
};
