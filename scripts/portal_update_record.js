require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = process.env.MONGODB_URI;
const chinaz = require('../modules/chinaz.js');
const cz = Object.create(chinaz);

module.exports = function () {
  MongoClient.connect(MONGODB_URI, (err, db) => {
    if (!err) {
      collectRecords();
    }
  
    function collectRecords (i, inserts) {
      i = i || 1;
      inserts = inserts || [];
  
      switch (i) {
        case 1:
          site = 'news.qq.com';
          break;
        case 2:
          site = 'news.sina.com.cn';
          break;
        case 3:
          site = 'news.163.com';
          break;
        case 4:
          site = 'news.sohu.com';
      }
      
      cz.getRecord(site, reply => {
        const new_record = reply.status == 1 ? parseInt(reply.record) : 0;
        
        if (new_record) {
          inserts.push({ site: site, new_record: new_record});
        }
  
        if (i == 4) {
          updateRecords(inserts);
          
        } else {
          setTimeout(() => {
            collectRecords(i + 1, inserts);
          }, 5000);
        }
      });
    }
    
    
    function updateRecords (inserts) {
      let counter = 0;
  
      if (inserts.length) {
        inserts.forEach(el => {
          db.collection('portals').findOne({site: el.site}, (err, doc) => {
  
            if (!err) {
              doc.records.push(el.new_record);
              const new_records = doc.records.sort((a, b) => a < b).slice(doc.records.length == 361 ? 1 : 0);

              db.collection('portals').updateOne({site: el.site}, {$set: {records: new_records}}, err => {
                counter ++;
                if (counter == inserts.length) {
                  db.close();
                }
              });
            }
          });
        });
  
      } else {
        db.close();
      }
    }
  
  });
}