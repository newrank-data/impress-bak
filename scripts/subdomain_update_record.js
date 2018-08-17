require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const MONGODB_URI = process.env.MONGODB_URI;
const chinaz = require('../modules/chinaz.js');
const cz = Object.create(chinaz);

module.exports = function () {
  MongoClient.connect(MONGODB_URI, (err, db) => {
    if (!err) {
      const query = { $and: [{
        'details.subdomains_data': {$exists: 1},
      }, {
        'details.subdomains_data': {$not: {$size: 0}}
      }]};
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
                const re = /^[m|big5|mail|search|oa]\./i;
                subdomains_data = doc.details.subdomains_data.filter(v => !re.test(v.subdomain) && v.subdomain != doc.domain && v.subdomain != 'OTHER');
                console.log(`\n${doc.domain}: ${subdomains_data.length}`);

                if (subdomains_data.length) {
                  updateRecords(0);
                } else {
                  db.close();
                }
              } else {
                db.close();
              }
            });
        } else {
          db.close();
        }
      });

      function updateRecords (i) {
        const data = subdomains_data[i];
        cz.getRecord(data.subdomain, reply => {

          if (reply.status == 1) {
            const cursor = db.collection('subdomains').find({subdomain: data.subdomain});
            cursor.nextObject((err, doc) => {

              if (!err) {
                if (doc) {
                  // 已存在记录时更新
                  console.log(`√ ${data.subdomain}`);
                  doc.records.push(reply.record);
                  const new_records = doc.records.sort((a, b) => a < b).slice(doc.records.length == 31 ? 1 : 0);
                  db.collection('subdomains').updateOne({
                    _id: ObjectId(doc._id)
                  }, {
                    $set: {records: new_records}
                  }, () => {
                    i++;
                    if (i == subdomains_data.length) {
                      db.close();
                    } else {
                      setTimeout(() => {
                        updateRecords(i);
                      }, 1000);
                    }
                  });

                } else {
                  // 不存在记录时插入
                  console.log(`√ ${data.subdomain}`);
                  db.collection('subdomains').insertOne({
                    subdomain: data.subdomain,
                    records: [reply.record]
                  }, () => {
                    i++;
                    if (i == subdomains_data.length) {
                      db.close();
                    } else {
                      setTimeout(() => {
                        updateRecords(i);
                      }, 1000);
                    }
                  }); 
                }
                
              } else {
                i++;
                if (i == subdomains_data.length) {
                  db.close();
                } else {
                  setTimeout(() => {
                    updateRecords(i);
                  }, 1000);
                }
              }
            });

          } else {
            console.log(`× ${data.subdomain}: ${reply.status}`);
            i++;
            if (i == subdomains_data.length) {
              db.close();
            } else {
              setTimeout(() => {
                updateRecords(i);
              }, 1000);
            }
          }
        });

      }
    }
  })
}