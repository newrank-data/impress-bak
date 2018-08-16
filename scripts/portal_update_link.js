require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = process.env.MONGODB_URI;
const superagent = require('superagent');

module.exports = function () {
  MongoClient.connect(MONGODB_URI, (err, db) => {
    if (!err) {
      const sites = ['news.qq.com', 'news.sina.com.cn', 'news.163.com', 'news.sohu.com'];
      const re = /(\<a\s)/g;
      let counter = 0;

      sites.forEach(site => {
        superagent
          .get(site)
          .timeout({response: 20000, deadline: 30000})
          .end((err, reply) => {

            if (!err) {
              const link_num = reply.text.match(re).length;
              
              db.collection('portals').findOne({site: site}, (err, doc) => {
                if (!err) {
                  doc.links.push(link_num);
                  const new_links = doc.links.sort((a,b) => a < b).slice(doc.links.length == 361 ? 1 : 0);

                  db.collection('portals').updateOne({site: site}, {
                    $set: {links: new_links}
                  }, err => {

                    counter++;
                      if (counter == 4) {
                        db.close();
                      }
                  });

                } else {
                  counter++;
                  if (counter == 4) {
                    db.close();
                  }
                }
              })

            } else {
              counter++;
              if (counter == 4) {
                db.close();
              }
            }
          });
      });
    }
  });
}