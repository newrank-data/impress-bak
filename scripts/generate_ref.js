require('dotenv').config();
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = process.env.MONGODB_URI;

module.exports = function (callback) {
  MongoClient.connect(MONGODB_URI, (err, db) => {
    if (!err) {
      const cursor = db.collection('portals').find({}, {_id: 0});
      cursor.toArray((err, docs) => {
        const avgs = docs.map(doc => {

          // 求出四大门户网站各自新闻频道的平均收录数和平均链接数，其中链接数 * 5 是预估首页只展示了 1/5
          const avg_record = doc.records.reduce((acc, cv) => acc + cv, 0) / doc.records.length;
          const avg_link = doc.links.reduce((acc, cv) => acc + cv, 0) * 5 / doc.links.length;

          return {
            site: doc.site,
            avg_record: avg_record,
            avg_link: avg_link
          }
        });
        
        // 四大门户权重各 25%，求出参考收录数和链接数，相除后得出换算系数
        const record = avgs.reduce((acc, cv) => acc + cv.avg_record * 0.25, 0);
        const link = avgs.reduce((acc, cv) => acc + cv.avg_link * 0.25, 0);
        const factor = avgs.reduce((acc, cv) => acc + (cv.avg_record / cv.avg_link) * 0.25, 0);

        const ref = {
          record: parseInt(record),
          link: parseInt(link),
          factor: parseFloat(factor.toFixed(2)),
          dieoff: Math.log(Math.pow(record, 2)),
          updateAt: new Date().toLocaleDateString()
        };
        
        db.close();
        fs.writeFileSync('public/ref.json', JSON.stringify(ref));
        callback({
          status: 1,
          ref: ref
        })
      });
        
    } else {
      callback({
        status: 1001,
        msg: '连接数据库失败'
      })
    }
  });
}

