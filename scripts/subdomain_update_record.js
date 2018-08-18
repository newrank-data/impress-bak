require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const MONGODB_URI = process.env.MONGODB_URI;
const chinaz = require('../modules/chinaz.js');
const cz = Object.create(chinaz);

module.exports = function () {
  MongoClient.connect(MONGODB_URI, (err, db) => {
    if (!err) {

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
        const cursor = db.collection('alexa').find(query).sort({'record_update': 1}).limit(1);
  
        cursor.nextObject((err, doc) => {
          if (!err) {
            db.collection('alexa').updateOne({
              _id: ObjectId(doc._id)
            }, {
              $set: {
                'record_update': Math.floor(Date.now() / 1000)
              }}, err => {
                if (!err) {
                  const re = /^m|big5|mail|search|oa|3g|app|wap|account|hr|cms\./i;
                  datas = doc.details.subdomains_data.filter(
                    v => !re.test(v.subdomain) && v.subdomain != doc.domain && v.subdomain != 'OTHER'
                  );
                  console.log(`\n${doc.domain}: ${datas.length}`);
        
                  if (datas.length) {
                    count = datas.length;
                    updateSubdomainRecord();
                  } else {
                    setTimeout(switchDomain, 10000);
                  }
                } else {
                  setTimeout(switchDomain, 10000);
                }
              });
          } else {
            setTimeout(switchDomain, 10000);
          }
        });
  
        function updateSubdomainRecord () {
          const data = datas[i];
          cz.getRecord(data.subdomain, reply => {
          
            if (reply.status == 1) {
              const cursor = db.collection('subdomains').find({subdomain: data.subdomain});
              cursor.nextObject((err, doc) => {
          
                if (!err) {
                  if (doc) {
                    // 已存在记录时更新
                    console.log(`√ [${i}]${data.subdomain}`);
                    doc.records.push(reply.record);
                    const new_records = doc.records.sort((a, b) => a < b).slice(doc.records.length == 31 ? 1 : 0);
  
                    db.collection('subdomains').updateOne({
                      _id: ObjectId(doc._id)
                    }, {
                      $set: {records: new_records}
                    }, () => {
                      i++;
                      if (i == count) {
                        switchDomain()
                      } else {
                        setTimeout(() => {
                          updateSubdomainRecord();
                        }, 5000);
                      }
                    });
          
                  } else {
                    // 不存在记录时插入
                    console.log(`√ [${i + 1}]${data.subdomain}`);
  
                    db.collection('subdomains').insertOne({
                      subdomain: data.subdomain,
                      records: [reply.record]
                    }, () => {
                      i++;
                      if (i == count) {
                        switchDomain();
                      } else {
                        setTimeout(() => {
                          updateSubdomainRecord();
                        }, 5000);
                      }
                    }); 
                  }
                  
                } else {
                  i++;
                  if (i == count) {
                    switchDomain();
                  } else {
                    setTimeout(() => {
                      updateSubdomainRecord();
                    }, 5000);
                  }
                }
              });
          
            } else {
              console.log(`× [${i + 1}]${data.subdomain}: ${reply.status}`);
              i++;
              if (i == count) {
                switchDomain();
              } else {
                setTimeout(() => {
                  updateSubdomainRecord();
                }, 5000);
              }
            }
          });
  
        }
      }
    }
  });
}