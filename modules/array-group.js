module.exports = function (arr, key, callback) {

  if (typeof arr == 'object' && typeof key == 'string' && typeof callback == 'function') {
    const flag1 = arr.every(el => {
      return typeof el == 'object' && el.hasOwnProperty(key);
    });

    if (flag1) {
      const new_arr = [{}];
      new_arr[0][key] = arr[0][key];
      delete arr[0][key];
      new_arr[0].sub = [];
      new_arr[0].sub.push(arr[0]); 
      
      for (let i = 1; i < arr.length; i++) {
        const el = arr[i];
        let flag2 = false;
        
        for (let j = 0; j < new_arr.length; j++) {
          const new_el = new_arr[j];

          if (new_el[key] == el[key]) {
            delete el[key];
            new_el.sub.push(el);
            flag2 = true;
            break;
          }
        }

        if (flag2) {
          continue;

        } else {
          const obj = {};
          obj[key] = el[key];
          delete el[key];
          obj.sub = [];
          obj.sub.push(el);
          new_arr.push(obj);
        }
      }

      callback(null, new_arr);
      
    } else {
      callback(new Error(`the "${key}" key is not present in all elements.`));
    }

    
  } else {
    throw new Error('invalid parameter.');
  }

}