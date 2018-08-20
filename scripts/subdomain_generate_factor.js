require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = process.env.MONGODB_URI;

MongoClient.connect(MONGODB_URI, (err, db) => {

  if (!err) {
    const cursor = db.collection('portals').find({}, {_id: 0});
    cursor.toArray((err, docs) => {

      if (!err) {
        const avgs = docs.map(doc => {
          const avg_record = doc.records.reduce((acc, cv) => acc + cv, 0) / doc.records.length;
          const avg_link = doc.links.reduce((acc, cv) => acc + cv, 0) / doc.links.length;
          
          return {
            site: doc.site,
            avg_record: avg_record,
            avg_link: avg_link
          }
        });

        const factor = avgs.reduce((acc, cv) => acc + (cv.avg_record / cv.avg_link) * 0.25, 0);
        db.close();
        return {status: 1, factor: factor.toFixed(2)};

      } else {
        db.close();
        return {status: 1002};
      }
    });

  } else {
    return {status: 1001};
  }
});