const fs = require('fs');
const chinaz = require('../modules/chinaz.js');
const cz = Object.create(chinaz);
let portals = null;

try {
  portals = fs.readFileSync('public/data/portals.json');

} catch(err) {
  portals = [{
    site: 'news.qq.com',
    records: []
  }, {
    site: 'news.sina.com.cn',
    records: []
  }, {
    site: 'news.163.com',
    records: []
  }, {
    site: 'news.sohu.com',
    records: []
  }];
}

let i = 0;

function updateRecords () {
  const portal = portals[i];
  cz.getRecord(portal.site, function (reply) {
    
    if (reply.status == 1) {
      portal.records.push(reply.record);

      if (portal.records.length > 30) {
        portal.records = portal.records.sort((a, b) => a < b);
        portal.records = portal.records.slice(portal.records.length - 30);
      }
    }
    
    i += 1;

    if (i == 4) {
      fs.writeFileSync('public/data/portals.json', JSON.stringify(portals));
      i = 0;
    } else {
      setTimeout(updateRecords, 10000);
    }
  })
}

module.exports = updateRecords;