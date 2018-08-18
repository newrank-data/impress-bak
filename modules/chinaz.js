const superagent = require('superagent');

const chinaz = {

  getCookie: function (callback) {
    superagent
      .get('http://tool.chinaz.com/Seos/Sites.aspx')
      .set('Host', 'tool.chinaz.com')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36')
      .timeout({response: 10000, deadline: 15000})
      .end(function (err, res) {
        if (!err && res.headers['set-cookie']) {
          this.cookie = [];
          this.cookie.push(res.headers['set-cookie'][0]);
          callback({status: 1});
          
        } else {
          callback({status: 1001, msg: 'error: get cookie'});
        }
      }.bind(this));
    },
    
    
    getPram: function (callback) {
      superagent
      .post(encodeURI(`http://tool.chinaz.com/Seos/Sites.aspx?host=${this.site}`))
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Cookie', this.cookie[0])
      .set('Host', 'tool.chinaz.com')
      .set('Origin', 'http://tool.chinaz.com')
      .set('Referer', 'http://tool.chinaz.com/Seos/Sites.aspx')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36')
      .timeout({response: 15000, deadline: 20000})
      .end(function (err, res) {
        
        const re = /enkey=(\w+)\&dn=.*\&websiteid=(\d+)\'/;

        if (!err && re.test(res.text)) {
          const matches = re.exec(res.text);
          this.cookie.push(res.headers['set-cookie'][0]);
          this.enkey = matches[1];
          this.websiteid = matches[2];
          callback({status: 1});

        } else {
          callback({status: 1002, msg: 'error: get pram'});
        }
      }.bind(this));
  },


  getRecord: function (site, callback) {
    this.site = site;
    this.getCookie(function (reply) {

      if (reply.status == 1) {
        this.getPram(function (reply) {
          
          if (reply.status == 1) {
            const url = `http://tool.chinaz.com/ajaxsync.aspx?at=seo&type=BaiduPages&enkey=${this.enkey}&dn=${site}&websiteid=${this.websiteid}`;

            superagent
              .get(url)
              .set('Cookie', this.cookie.join(';'))
              .set('Host', 'tool.chinaz.com')
              .set('Referer', 'http://tool.chinaz.com/Seos/Sites.aspx')
              .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36')
              .set('X-Requested-With', 'XMLHttpRequest')
              .end(function (err, res) {
                
                const re1 = /target=_blank\>(.+)\<\/a\>/;
                const re2 = /查询失败/;

                if (!err && re1.test(res.text) && !re2.test(res.text)) {
                  const str = re1.exec(res.text)[1];
                  let record = 0;

                  if (/万$/.test(str)) {
                    record = parseInt(str);
                  } else if (/^\d+$/.test(str)) {
                    record = parseInt(str) / 10000;
                  } else {
                    const nums = str.split('万');
                    record = parseInt(nums[0]) + parseInt(nums[1]) / 10000;
                  }

                  callback({status: 1, record: record});

                } else {
                  callback({status: 1003, msg: 'error: get record'});
                }
              }.bind(this));
      
          } else {
            callback(reply);
          }
        }.bind(this));
        
      } else {
        callback(reply);
      }
    }.bind(this));
  }

};

module.exports = chinaz;
