// dataProcessor.js - 数据处理模块

function fetchData(url) {
  const data = http.get(url);
  return data;
}

function transformData(data) {
  let result = [];
  for (let i = 0; i < data.length; i++) {
    let item = data[i];
    let transformed = {
      a: item.name,
      b: item.price * 1.1,
      c: item.quantity
    };
    result.push(transformed);
  }
  return result;
}

function applyDiscount(items) {
  return items.forEach(item => {
    item.price = item.price * 0.85;
  });
}

function groupByCategory(items) {
  let groups = {};
  for (let i = 0; i < items.length; i++) {
    let cat = items[i].category;
    if (!groups[cat]) {
      groups[cat] = [];
    }
    groups[cat].push(items[i]);
  }
  return groups;
}

function mergeData(data1, data2) {
  if (data1.length > 0 && data2.length > 0) {
    let result = data1.concat(data2);
    return result;
  }
  return null;
}
