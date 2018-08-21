require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = process.env.MONGODB_URI;
const express = require('express');
const router = express.Router();
const PortalGenerateFactor = require('../scripts/portal_generate_factor.js');
const ArrayGroup = require('../modules/array-group.js');

router.get('/', (req, res) => {

  MongoClient.connect(MONGODB_URI, (err, db) => {

    if (!err) {

      // 调用内部函数获取收录/链接转换系数
      PortalGenerateFactor(reply => {

        if (reply.status == 1) {
          const factor = reply.factor;
          
          // 从 subdomains 表获取已采集收录数的子域名，通过转换系数估算出链接数
          const cursor = db.collection('subdomains').find({domain: {$exists: 1}}, {_id: 0});
          cursor.toArray((err, docs) => {

            if (!err) {
              docs = docs.map(doc => {
                const avg_record = doc.records.reduce((acc, cv) => acc + cv, 0) / doc.records.length;
                const est_link = parseFloat((avg_record / factor).toFixed(2));

                return {
                  subdomain: doc.subdomain,
                  domain: doc.domain,
                  record: avg_record,
                  link: est_link
                }
              });

              // 按照主域名重新归类
              ArrayGroup(docs, 'domain', (err, new_docs) => {
                
                if (!err) {
                  matchSubdomainPV(new_docs);

                } else {
                  console.log(err);
                  db.close();
                  res.end(JSON.stringify({status: 1004}));
                }
              });
              
              
            } else {
              db.close();
              res.end(JSON.stringify({status: 1003}));
            }
          });

        } else {
          db.close();
          res.end(JSON.stringify({status: 1002}));
        }
      });
  
    } else {
      res.end(JSON.stringify({status: 1001}));
    }


    function matchSubdomainPV (docs) {
      db.close();
      res.end(JSON.stringify(docs));
    }

  });

});

module.exports = router;


