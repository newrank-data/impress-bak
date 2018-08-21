require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const MONGODB_URI = process.env.MONGODB_URI;
const BaiduRecord = require('../modules/baidu-record.js');

module.exports = function () {
  MongoClient.connect(MONGODB_URI, (err, db) => {
    if (!err) {

      // 筛选出更新时间最旧且子域名数量不为 0 的一个主域名进行循环更新
      const query = {
        $and: [{
          'details.subdomains_data': {$exists: 1},
        }, {
          'details.subdomains_data': {$not: {$size: 0}}
        }]};

      switchDomain();
  
      function switchDomain () {
        let datas = [];
        let i = 0;
        let count = 0;
        let domain = '';
        const cursor = db.collection('alexa').find(query).sort({'record_update': 1}).limit(1);
  
        // 主域名的百度收录数更新时间修改为当前时间
        cursor.nextObject((err, doc) => {
          if (!err) {
            db.collection('alexa').updateOne({
              _id: ObjectId(doc._id)
            }, {
              $set: {
                'record_update': Math.floor(Date.now() / 1000)
              }}, err => {
                
                // 剔除与内容无关的子域名
                if (!err) {
                  const re = /^m|big5|mail|search|oa|3g|app|wap|account|hr|cms|open|passport|login|auth|user\./i;
                  domain = doc.domain;
                  datas = doc.details.subdomains_data.filter(
                    v => !re.test(v.subdomain) && v.subdomain != doc.domain && v.subdomain != 'OTHER'
                  );

                  console.log(`\n${doc.domain}: ${datas.length}`);
                  
                  // 剔除后子域名数量不为 0 时调用接口查询百度收录数
                  if (datas.length) {
                    count = datas.length;
                    updateSubdomainRecord();

                  } else {
                    switchDomain();

                  }
                } else {
                  switchDomain();
                }
              });
          } else {
            switchDomain();
          }
        });
  
        function updateSubdomainRecord () {
          const data = datas[i];
          BaiduRecord(data.subdomain, reply => {
          
            if (reply.status == 1) {
              const cursor = db.collection('subdomains').find({subdomain: data.subdomain});

              cursor.nextObject((err, doc) => {

                if (!err) {

                  if (doc) {

                    // 已存在记录时更新
                    doc.records.push(reply.record);
                    const new_records = doc.records.sort((a, b) => a < b).slice(doc.records.length == 121 ? 1 : 0);
                    
                    db.collection('subdomains').updateOne({
                      _id: ObjectId(doc._id)
                    }, {
                      $set: {records: new_records}
                    }, () => {
                      
                      console.log(`√ [${i}]${data.subdomain}`);

                      if (++i == count) {
                        switchDomain()

                      } else {
                        setTimeout(() => {
                          updateSubdomainRecord();
                        }, 10000);
                      }
                    });
          
                  } else {

                    // 不存在记录时插入
                    db.collection('subdomains').insertOne({
                      subdomain: data.subdomain,
                      domain: domain,
                      records: [reply.record]
                    }, () => {
                      
                      console.log(`√ [${i + 1}]${data.subdomain}`);

                      if (++i == count) {
                        switchDomain();

                      } else {
                        setTimeout(() => {
                          updateSubdomainRecord();
                        }, 10000);
                      }
                    }); 
                  }
                  
                } else {
                  if (++i == count) {
                    switchDomain();

                  } else {
                    setTimeout(() => {
                      updateSubdomainRecord();
                    }, 10000);
                  }
                }
              });
          
            } else {
              console.log(`× [${i + 1}]${data.subdomain}`);
              if (++i == count) {
                switchDomain();

              } else {
                setTimeout(() => {
                  updateSubdomainRecord();
                }, 10000);
              }
            }
          });
  
        }
      }
    }
  });
}