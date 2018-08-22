const fs = require('fs');
const SubdomainGenerateList = require('./subdomain_generate_list.js');
const result = [];

SubdomainGenerateList(reply => {
  
  if (reply.status == 1) {
    const data = reply.data;
    data.forEach(el => {

      el.sub.forEach(sub_el => {
        result.push(`${sub_el.subdomain}, ${sub_el.record}, ${sub_el.percentage}, ${sub_el.pv}`);
      });
    });

    fs.writeFileSync(__dirname + 'subdomain.csv', result.join('\n'));

  } else {
    console.log(reply.status);
  }
});