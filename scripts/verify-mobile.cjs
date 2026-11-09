async (page) => {
  const passed = [], errors = [];
  const check = (condition, name) => { if (!condition) throw new Error(name); passed.push(name); };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/');

  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px invitation has no overflow`);
    const enter = page.getByRole('button', { name: '接受贵宾邀请', exact: false });
    const box = await enter.boundingBox();
    check(box && box.height >= 44, `${width}px primary action is touch sized`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '接受贵宾邀请', exact: false }).tap();
  check(await page.locator('[name=years]').evaluate((element) => parseFloat(getComputedStyle(element).fontSize) >= 16), 'inputs avoid mobile focus zoom');
  await page.locator('[name=nickname]').fill('手机嘉宾');
  await page.locator('[name=years]').fill('8');
  await page.locator('[name=daily]').fill('10');
  await page.locator('[name=monthly]').fill('400');
  await page.locator('[name=adult]').check();
  await page.getByRole('button', { name: '提交参评资料', exact: false }).tap();
  check((await page.locator('#winner-name').textContent()) === '手机嘉宾', 'mobile form personalizes the award');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile award has no overflow');

  await page.evaluate(() => window.__product.showAct('finale'));
  const share = page.getByRole('button', { name: '分享拒领奖声明', exact: false });
  const shareBox = await share.boundingBox();
  check(shareBox && shareBox.height >= 44, 'mobile share action is touch sized');
  check(errors.length === 0, 'no mobile JavaScript errors');
  return { passed, errors };
}
