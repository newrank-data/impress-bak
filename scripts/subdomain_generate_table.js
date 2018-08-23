const fs = require('fs');
const PortalGenerateRef = require('./portal_generate_ref.js');
const SubdomainGenerateList = require('./subdomain_generate_list.js');

module.exports = function () {

  PortalGenerateRef(reply => {
    
    if (reply.status == 1) {
  
      const ref_record = Math.log(reply.record);
      const ref_factor = reply.factor;
      
      SubdomainGenerateList(reply => {
        
        if (reply.status == 1) {
          const data = [];
  
          reply.data.forEach(el => {
            el.sub.forEach(sub_el => {
  
              sub_el.dieoff = Math.log(sub_el.record) / ref_record;
              sub_el.factor = Math.pow(sub_el.dieoff, 2) * ref_factor;
              sub_el.link = sub_el.record / sub_el.factor;
  
              if (sub_el.link >= 5) {
                sub_el.impress = parseFloat((sub_el.pv * 0.2 / sub_el.link * 0.8).toFixed(2));

                if (sub_el.impress >= 10 && sub_el.impress <= 10000) {
                  data.push(sub_el);
                }
              }
            });
          });
  
          const table = data.map(el => {
            return `${el.subdomain}, ${el.record}, ${el.percentage}, ${el.pv}, ${el.factor}, ${el.link}, ${el.dieoff}, ${el.impress}`;
          });
          
          if (!fs.existsSync('public/files')) {
            fs.mkdirSync('public/files');
          }
  
          const headers = 'subdomain, record, percentage, pv, factor, link, dieoff, impress\n';
      
          fs.writeFileSync('public/files/subdomain.csv', headers + table.join('\n'));
          
        } else {
          console.log(reply.status);
        }
      });
  
    } else {
      console.log(reply.status);
    }
  });
  
}
