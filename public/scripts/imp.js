importScripts('https://cdn.jsdelivr.net/npm/dexie@2.0.4/dist/dexie.min.js');
importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.13.4/dist/xlsx.full.min.js');
importScripts('tld.js');

let impDB;
const books = [];

postMessage('😈小恶魔启动');

addEventListener('message', function (e) {
  books.push(e.data);
  if (books.length === 2) {
    parseSheet(books);
  }
});

function parseSheet (books) {
  const sheets = {};
  
  books.forEach((book, index) => {
    this.postMessage(`解析 ${index === 0 ? 'data' : 'dpt'} 表`);
    const data = new Uint8Array(book);
    sheet = XLSX.read(data, {type: 'array'}).Sheets.sheet;
    const matches = /[A-Z]+\d+:([A-Z]+)(\d+)/.exec(sheet['!ref']);
    const lastCol = matches[1];
    const rowCount = parseInt(matches[2]);
    
    const cols = genCols(lastCol);
    const fields = genFields(cols, sheet);
    const rows = genRows(index === 0 ? 't_data' : 't_dpt', rowCount, fields, sheet);

    if (index === 0) {
      sheets.t_data = rows;

    } else {
      sheets.t_dpt = rows;
    }
  });

  postMessage(`匹配 data/dpt 表，共 ${sheets.t_data.length} 条记录`);
  matchSheets(sheets);
}


// 根据最后一列序号生成所有列序号
function genCols (lastCol) {
  const baseCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  const cols = [];
  let flag = true;

  while (flag) {
    if (cols.length < 26) {
      const col = baseCols[cols.length];
      cols.push(col);

      if (col == lastCol) {
        flag = false;
      }

    } else {
      const tmpCols = cols.slice(-26);
      for (let i = 0; i < tmpCols.length; i++) {
        const tmpCol = tmpCols[i];
        
        for (let j = 0; j < baseCols.length; j++) {
          const baseCol = baseCols[j];
          const col = tmpCol + baseCol;
          cols.push(col);

          if (col == lastCol) {
            flag = false;
            break;
          }
        }

        if (!flag) {
          break;
        }
      }
    }
  }

  return cols;
}


// 生成 { 字段名: 列序号 } 映射，用于 data 表和 dpt 表的匹配
function genFields (cols, sheet) {
  const fields = {};

  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const key = col + '1';
    fields[sheet[key].v] = col;
  }

  return fields;
}


// 将每行数据整理为一个对象，整表数据以数组形式返回
function genRows (type, rowCount, fields, sheet) {
  const rows = [];

  if (type == 't_data') {
    const url_crc_key = fields['url_crc'];
    const url_key = fields['url'];
    const source_type_key = fields['source_type'];
    const author_key = fields['author'];
    const media_name_key = fields['media_name'];
    const original_media_name_key = fields['original_media_name'];
    const content_media_name_key = fields['content_media_name'];
    const source_tags_key = fields['source_tags'];

    for (let i = 2; i <= rowCount; i++) {
      const row = {};
      row.url_crc = sheet[url_crc_key + i.toString()].v;
      row.url = sheet[url_key + i.toString()].v;
      row.source_type = parseInt(sheet[source_type_key + i.toString()].v);
      row.author = sheet[author_key + i.toString()] ? sheet[author_key + i.toString()].v : '';
      row.media_name = sheet[media_name_key + i.toString()].v;
      row.original_media_name = sheet[original_media_name_key + i.toString()] ? sheet[original_media_name_key + i.toString()].v : '';
      row.content_media_name = sheet[content_media_name_key + i.toString()] ? sheet[content_media_name_key + i.toString()].v : '';
      source_tags = sheet[source_tags_key + i.toString()] ? sheet[source_tags_key + i.toString()].v : '';

      // 校正 app 类型
      if (row.source_type == '0' && source_tags == 'app') {
        row.source_type = 12;
      }

      rows.push(row);
    }

  } else {
    const url_crc_key = fields['url_crc'];
    const attitudes_count_key = fields['attitudes_count'];
    const click_count_key = fields['click_count'];
    const comments_count_key = fields['comments_count'];
    const quote_count_key = fields['quote_count'];

    for (let i = 2; i <= rowCount; i++) {
      const row = {};

      row.url_crc = sheet[url_crc_key + i.toString()].v;
      row.attitudes_count = sheet[attitudes_count_key + i.toString()] ? parseInt(sheet[attitudes_count_key + i.toString()].v) : 0;
      row.click_count = sheet[click_count_key + i.toString()] ? parseInt(sheet[click_count_key + i.toString()].v) : 0;
      row.comments_count = sheet[comments_count_key + i.toString()] ? parseInt(sheet[comments_count_key + i.toString()].v) : 0;
      row.quote_count = sheet[quote_count_key + i.toString()] ? parseInt(sheet[quote_count_key + i.toString()].v) : 0;
      
      rows.push(row);
    }
  }

  return rows;
}


// 以 url_crc 字段进行 data 表和 dpt 表的匹配，将阅评赞转数据并入 data 表
function matchSheets (sheets) {
  for (let i = 0; i < sheets.t_data.length; i++) {
    const data = sheets.t_data[i];
    let flag = false;
    
    for (let j = 0; j < sheets.t_dpt.length; j++) {
      const dpt = sheets.t_dpt[j];
      
      if (data.url_crc == dpt.url_crc) {
        data.attitudes_count = dpt.attitudes_count;
        data.click_count = dpt.click_count;
        data.comments_count = dpt.comments_count;
        data.quote_count = dpt.quote_count;
        flag = true;
        break;
      }
    }

    if (!flag) {
      data.attitudes_count = 0;
      data.click_count = 0;
      data.comments_count = 0;
      data.quote_count = 0;
    }

    data.impress = 0;
  }

  extractDomian(sheets.t_data);
}


function extractDomian(datas) {
  postMessage('提取域名')
  datas = datas.map(v => {
    const extraction = tld.parse(v.url);
    if (extraction.isValid) {
      v.domain = extraction.domain;
      v.subdomain = extraction.subdomain;
      v.hostname = extraction.hostname;
      
    } else {
      postMessage(`url_crc = ${v.url_crc} 的记录不包含有效域名`, true)
    }
    return v;
  });

  datas = datas.filter(v => v.domain);
  insertDB(datas);
}


function insertDB(datas) {
  // 重建数据库后再插入新数据
  Dexie.delete('newrank')
    .then(() => {
      return new Dexie('newrank');
    })
    .then(db => {
      impDB = db;
      postMessage('写入数据库');
      db.version(1).stores({
        impress: 'url_crc,source_type,click_count,comments_count,domain,impress'
      });

      db.impress.bulkAdd(datas)
        .then(() => {
          calculateWeibo();
        });
    })
    .catch(err => {
      console.log(err);
      app.pushLog({text: '出错了', flag: true});
    });
}


function calculateWeibo () {
  impDB.impress
    .where({source_type: 4})
    .toArray(rows => {
      postMessage(`计算 source_type = 4 的记录，共 ${rows.length} 条`);
      rows.forEach(row => {
        row.impress = Math.round(Math.max(94, row.quote_count, row.comments_count * 90, row.attitudes_count / 0.00014 / 37.86));
      });

      impDB.impress
        .bulkPut(rows)
        .then(() => {
          calculateClick();
        });
    });
}


function calculateClick () {
  impDB.impress
  .where('click_count')
  .above(0)
  .toArray(rows => {
      postMessage(`计算 click_count ≠ 0 的记录，共 ${rows.length} 条`);
      rows.forEach(row => {
        row.impress = Math.max(row.click_count, 10);
      });
      
      impDB.impress
      .bulkPut(rows)
      .then(() => {
        calculateComment();
      });
    });
  }
  
  function calculateComment() {
    impDB.impress
    .where('comments_count')
    .above(0)
    .toArray(rows => {
      rows = rows.filter(v => v.impress === 0);
      postMessage(`计算 comments_count ≠ 0 的记录，共 ${rows.length} 条`);
      rows.forEach(row => {
        row.impress = row.comments_count * 303;
      });

      impDB.impress
        .bulkPut(rows)
        .then(() => {
          calculateNotApp();
        });
    });
}


function calculateNotApp () {
  impDB.impress
    .orderBy('domain')
    .toArray(rows => {
      rows = rows.filter(row => row.source_type != 12 && row.source_type != 4 && row.click_count === 0);
      postMessage(`计算 source_type = 0/1/2/3/5/6 的记录，共 ${rows.length} 条`);
      let currentDetails = {domain: ''};
      let lastDomain = '';
      const alexaNotFound = [];

      let i = 0;
      matchSubdomains();

      async function matchSubdomains () {
        const row = rows[i];
        if (row.domain != currentDetails.domain && row.domain != lastDomain) {
          const reply = await getDomainDetails(row.domain);
  
          if (reply.status == 200) {
            currentDetails = reply.data;
            lastDomain = row.domain;
            matchDomianDetails(row, currentDetails);
            i += 1;

            if (i < rows.length) {
              matchSubdomains();

            } else {
              postMessage(`${alexaNotFound.length} 个域名在 alexa 表中无数据`);
              impDB.impress
                .bulkPut(rows)
                .then(() => {
                  calculateApp();
                });
            }
            
          } else {
            row.impress = Math.max(row.impress, 10);
            alexaNotFound.push(row.domain);
            lastDomain = row.domain;
            i += 1;
  
            if (i < rows.length) {
              matchSubdomains();

            } else {
              postMessage(`${alexaNotFound.length} 个域名在 alexa 表中无数据`);
              impDB.impress
              .bulkPut(rows)
              .then(() => {
                calculateApp();
              });
            }
          }
          
        } else if (currentDetails.domain == row.domain) {
          matchDomianDetails(row, currentDetails);
          i += 1;
          
          if (i < rows.length) {
            matchSubdomains();
            
          } else {
            postMessage(`${alexaNotFound.length} 个域名在 alexa 表中无数据`);
            impDB.impress
            .bulkPut(rows)
            .then(() => {
              calculateApp();
            });
          }

        } else {
          row.impress = 10;
          i += 1;

          if (i < rows.length) {
            matchSubdomains();

          } else {
            postMessage(`${alexaNotFound.length} 个域名在 alexa 表中无数据`);
            impDB.impress
            .bulkPut(rows)
            .then(() => {
              calculateApp();
            });
          }
        }
      }
    });
}


function calculateApp () {
  impDB.impress
    .where({source_type: 12})
    .toArray(rows => {
      rows = rows.filter(row => row.impress === 0 && row.click_count === 0);
      postMessage(`计算 source_type = 12 的记录，共 ${rows.length} 条`);
      rows.forEach(row => {
        row.impress = row.domain == 'toutiao.com' ? 150 : 40;
      });

      impDB.impress
        .bulkPut(rows)
        .then(() => {
          postMessage('terminate');
        });
    });

}


async function getDomainDetails (domain) {
  const response = await fetch(`/domain/${domain}`);
  if (response.status == 200) {
    const data =  await response.json();
    return {
      status: 200,
      data: data
    };

  } else {
    return {
      status: response.status
    };
  }
}


function matchDomianDetails (row, details) {
  const subdomains = details.subdomains;

  // 子域名为空或 www 时，使用主域名值
  if ((row.hostname == row.domain) || (row.subdomain == 'www')) {
    row.impress = Math.max(details.impress, row.impress, 10);

  } else {
    let flag = false;
    for (let i = 0; i < subdomains.length; i++) {
      const sub = subdomains[i];
      
      // 子域名匹配成功时使用对应子域名的值
      if (row.hostname == sub.subdomain) {
        row.impress = Math.max(sub.impress, row.impress, 10);
        flag = true;
        break;
      }
    }
    
    // 子域名匹配失败时使用主域名最小值
    if (!flag) {
      row.impress = Math.max(details.minImpress, row.impress, 10);
    }
  }
}