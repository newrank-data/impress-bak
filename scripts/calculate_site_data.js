require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = process.env.MONGODB_URI;
const PortalGenerateFactor = require('./portal_generate_ref.js');
const ArrayGroup = require('../modules/array-group.js');

module.exports = function () {

  MongoClient.connect(MONGODB_URI, (err, db) => {

    let group_docs;
    let ref_factor;
    let ref_record;
    
    if (!err) {

      // 调用内部函数获取基准转换系数
      PortalGenerateFactor(reply => {

        if (reply.status == 1) {
          ref_factor = reply.factor;
          ref_record = reply.record;
          
          // 从 subdomains 表获取已采集收录数的子域名，计算平均收录数
          const cursor = db.collection('subdomains').find({domain: {$exists: 1}}, {_id: 0});
          cursor.toArray((err, docs) => {

            if (!err && docs.length) {
              docs = docs.map(doc => {
                const avg_record = doc.records.reduce((acc, cv) => acc + cv, 0) / doc.records.length;

                return {
                  subdomain: doc.subdomain,
                  domain: doc.domain,
                  record: avg_record,
                }
              });

              // 按照主域名重新归类
              ArrayGroup(docs, 'domain', (err, new_docs) => {
                
                if (!err) {
                  group_docs = new_docs;
                  matchSubdomainPV();

                } else {
                  handleError(1004);
                }
              });
              
            } else {
              handleError(1003);
            }
          });

        } else {
          handleError(1002);
        }
      });
  
    } else {
      handleError(1001);
    }


    // 根据主域名在 alexa 表匹配相应主域名下的子域名进行 pv 计算
    function matchSubdomainPV (i) {
      i = i || 0;
      const el = group_docs[i];
      const sub_els = el.sub;
      const cursor = db.collection('alexa').find({domain: el.domain}).limit(1);
      cursor.nextObject((err, doc) => {

        if (!err && doc && doc.details.traffic_data) {
          const traffic = doc.details.traffic_data;
          const pv = parseInt(
            traffic.three_month.avg_daily_pv
              || ( traffic_data.month.avg_daily_pv
                || ( traffic_data.week.avg_daily_pv
                  || traffic_data.day.avg_daily_pv)));

          const datas = doc.details.subdomains_data;
          el.pv = pv;
          
          for (let j = 0; j < sub_els.length; j++) {
            const sub_el = sub_els[j];

            for (let k = 0; k < datas.length; k++) {
              const data = datas[k];

              if (data.subdomain == sub_el.subdomain) {
                const percentage = parseFloat(data.pageviews_percentage) * 0.01;
                sub_el.pv = parseInt(pv * percentage);
                sub_el.percentage = parseFloat(percentage.toFixed(4));
                break;
              }
            }
          }

          if (++i == group_docs.length) {
            calculateData(group_docs);

          } else {
            matchSubdomainPV(i);
          }
          
        } else if (++i == group_docs.length) {
          calculateData(group_docs);

        } else {
          matchSubdomainPV(i);
        }
      })

    }

    
    function calculateData (docs) {

      const new_docs = docs.map(el => {

        let min_sub_impress = 0;
        const new_sub = el.sub.map(sub_el => {
          
          const dieoff = Math.pow(Math.log(sub_el.record) / Math.log(ref_record), 2);
          const factor = ref_factor * dieoff;
          const link = sub_el.record / factor;
          const dieoff_impress = (sub_el.pv / link) * (1 - dieoff);
          const avg_impress = (sub_el.pv * 0.2) / (link * 0.8);
          const impress = parseFloat(Math.max(dieoff_impress, avg_impress).toFixed(2));
          min_sub_impress = min_sub_impress === 0 ? impress : (impress < min_sub_impress ? impress :min_sub_impress);

          return {
            subdomain: sub_el.subdomain,
            record: sub_el.record,
            pv: sub_el.pv,
            percentage:sub_el.percentage,
            dieoff: dieoff,
            factor: factor,
            link: link,
            impress: impress
          };
        });

        return {
          domain: el.domain,
          pv: min_sub_impress,
          sub: new_sub
        };
      });

      db.collection('site').drop(err => {

        if (!err) {
          db.collection('site').insertMany(new_docs, err => {

            if (!err) {
              db.close();
              console.log('插入 site 表成功');
              
            } else {
              db.close();
              console.log('插入 site 表失败');
            }
          })
          
        } else {
          db.close();
          console.log('删除 site 表失败');
        }
      });
    }


    // 处理错误
    function handleError(status) {
      db.close();
      console.log(`error: ${status}`);
    }

  });

};
