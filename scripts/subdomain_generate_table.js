const fs = require('fs');
const PortalGenerateRef = require('./portal_generate_ref.js');
const SubdomainGenerateList = require('./subdomain_generate_list.js');

PortalGenerateRef(reply => {
  
  if (reply.status == 1) {

    const ref_record = Math.log(reply.record);
    const ref_link = reply.link;
    const ref_factor = reply.factor;
    const ref_acceleration = reply.acceleration;
    
    SubdomainGenerateList(reply => {
      
      if (reply.status == 1) {
        const data = [];

        reply.data.forEach(el => {
          el.sub.forEach(sub_el => {

            sub_el.factor = (Math.log(sub_el.record) / ref_record) * ref_factor;
            sub_el.link = sub_el.record / sub_el.factor;

            if (sub_el.link >= 10) {
              sub_el.dieoff = sub_el.link < ref_link
                ? 1 - ref_acceleration * Math.pow(sub_el.link, 2) * 0.5
                : 1 - ref_acceleration * Math.pow(ref_link - 1, 2) * 0.5;
              sub_el.impress = parseFloat(((sub_el.pv / sub_el.link) * sub_el.dieoff).toFixed(2));

              if (sub_el.impress >= 10) {
                data.push(sub_el);
              }
            }
          });
        });

        const table = data.map(el => {
          return `${el.subdomain}, ${el.record}, ${el.percentage}, ${el.pv}, ${el.factor}, ${el.link}, ${el.dieoff}, ${el.impress}`;
        });
        
        if (!fs.existsSync('public/file')) {
          fs.mkdirSync('public/file');
        }
    
        fs.writeFileSync('public/file/subdomain.csv', table.join('\n'));
        
      } else {
        console.log(reply.status);
      }
    });

  } else {
    console.log(reply.status);
  }
});