const fs = require('fs');
const cheerio = require('cheerio');
const request = require('./request');
const batch = require('batch-promises');
const ProgressBar = require('progress');

(async () => {
  if (!process.argv[2]) {
    throw new Error('沒給檔案位置辣，白痴');
  }
  console.log();
  const stream = fs.createWriteStream(process.argv[2]);
  console.log('  爬列表');
  const foods = await fetchFoodList();
  console.log('  爬食物成份');
  const bar = new ProgressBar('  [:bar] :rate/bps :percent :etas', { total: foods.length });
  bar.tick(0);
  await batch(40, foods, food => retry(() => fetchFoodData(bar, stream, food), 10));
  stream.end();
})().then(() => {
  console.log('  成功!');
  console.log();
  process.exit(0);
}, err => {
  console.error('  ' + err.message);
  console.log();
  console.log('  $ family <file_path>');
  console.log();
  process.exit(1);
});

async function fetchFoodList() {
  const res = await request.get('http://foodsafety.family.com.tw/Web_FFD/Page/FFD_1_1.aspx');
  const $ = cheerio.load(res.data);
  const foods = $('a')
    .filter((_, el) => {
      const $this = $(el);
      return /FFD_1_2/.test($this.attr('href'));
    })
    .map((_, el) => {
      const $this = $(el);
      return {
        name: $this.text(),
        href: 'http://foodsafety.family.com.tw/Web_FFD/Page/' + $this.attr('href'),
      };
    })
    .get();
  return foods;
}

const infoMap = {
  '過敏原': 'allergy',
  '規格(每份)': 'amount',
  '本包裝含幾份': 'portion',
  '熱量': 'calorie',
  '蛋白質': 'protein',
  '脂肪': 'fat',
  '飽和脂肪': 'saturated_fat',
  '反式脂肪': 'trans_fat',
  '碳水化合物': 'carbohydrate',
  '鈉': 'sodium',
  '糖': 'sugar',
};

async function retry(fn, times) {
  var err;
  while (times--) {
    try {
      await fn();
      err = null;
      return;
    } catch(e) {
      err = e;
    }
  }
  if (!err) {
    throw err;
  }
}

async function fetchFoodData(bar, stream, food) {
  const res = await request.get(food.href);
  const $ = cheerio.load(res.data);
  const info = $('.news-right h5')
    .map((_, el) => {
      const text = $(el).text();
      const parts = text.split('：').map(text => text.trim());
      if (!infoMap[parts[0]]) {
        return;
      }
      return {
        key: infoMap[parts[0]],
        value: parts[1],
      };
    })
    .get()
    .filter(Boolean)
    .reduce((info, field) => Object.assign(info, {
      [field.key]: field.value,
    }), food);
  stream.write(JSON.stringify(info) + '\n');
  bar.tick(1);
}
