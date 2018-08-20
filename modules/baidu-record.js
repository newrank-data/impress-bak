const superagent = require('superagent');
const re1 = /共有\s+<b\sstyle="color:#333">([\d|,]+)<\/b>/i;
const re2 = /结果数约(\d+)/i;
const re3 = /共有\s+<b\sstyle="color:#333">(\d+)亿(\d+)万/i;

module.exports = function (site, callback) {
  const url = encodeURI(`https://www.baidu.com/s?wd=site:${site}`);

  superagent
    .get(url)
    .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36')
    .end((err, res) => {

      if (!err) {
        let matches = re1.exec(res.text) || ( re2.exec(res.text) || null);

        if (matches) {
          const record = parseInt(matches[1].split(',').reduce((acc, cv) => acc + cv, ''));
          callback({status: 1, record: record});
          
        } else {
          matches = re3.exec(res.text) || null;
          
          if (matches) {
            const record = (parseInt(matches[1]) * 10000 + parseInt(matches[2])) * 10000;
            callback({status: 1, record: record});
            
          } else {
            callback({status: 1002})
          }
        }

      } else {
        callback({status: 1001});
      }
    });
}
