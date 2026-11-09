async (page) => {
  const passed = [], errors = [];
  const check = (condition, name) => { if (!condition) throw new Error(name); passed.push(name); };
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(() => localStorage.removeItem('afterglow-gala-v1'));
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 960 });
  check(await page.getByRole('button', { name: '接受贵宾邀请', exact: false }).isVisible(), 'invitation opens the experience');

  await page.getByRole('button', { name: '接受贵宾邀请', exact: false }).click();
  await page.locator('[name=nickname]').fill('测试嘉宾');
  await page.locator('[name=years]').fill('12');
  await page.locator('[name=daily]').fill('20');
  await page.locator('[name=monthly]').fill('800');
  await page.getByRole('button', { name: '提交参评资料', exact: false }).click();
  check((await page.locator('#form-error').textContent()).includes('已成年'), 'adult smoker confirmation is required');
  await page.locator('[name=adult]').check();
  await page.getByRole('button', { name: '提交参评资料', exact: false }).click();
  check((await page.locator('#award-title').textContent()).includes('长期合作'), 'first personalized award appears');
  check(await page.locator('#award-value').textContent() === '12', 'smoking years transfer to the award');

  await page.getByRole('button', { name: '请揭晓下一项大奖', exact: false }).click();
  check((await page.locator('#award-title').textContent()).includes('稳定增长'), 'second award appears');
  await page.getByRole('button', { name: '请揭晓下一项大奖', exact: false }).click();
  check((await page.locator('#award-value').textContent()).includes('115,200'), 'personal spend award is calculated');
  await page.getByRole('button', { name: '查看集团年度成绩', exact: false }).click();
  check(await page.locator('#report-spent').textContent() === '115,200', 'annual report repeats the personal estimate');
  check(await page.locator('#report-cigarettes').textContent() === '87,660', 'annual report calculates cumulative cigarettes');

  await page.getByRole('button', { name: '有请幕后贡献者登场', exact: false }).click();
  await page.getByRole('button', { name: '查看未列入报表的部分', exact: false }).click();
  await page.waitForFunction(() => window.__heartLab?.ready);
  check(await page.locator('#exposure').inputValue() === '12', 'profile transfers into the 3D heart');
  await page.getByRole('button', { name: '返回大会现场', exact: false }).click();
  check(await page.getByRole('button', { name: '我拒绝领奖', exact: false }).isVisible(), 'heart returns to the final award');
  await page.getByRole('button', { name: '我拒绝领奖', exact: false }).click();
  await page.getByRole('button', { name: '分享拒领奖声明', exact: false }).waitFor({ timeout: 5000 });
  check((await page.locator('.final-copy h2').textContent()).includes('可以缺席'), 'refusal reaches the shareable ending');

  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存海报', exact: true }).click();
  const download = await downloadEvent;
  await download.saveAs('output/playwright/refusal-poster.png');
  check(download.suggestedFilename().endsWith('.png'), 'refusal poster downloads as PNG');

  await page.getByRole('button', { name: '来源与创作说明', exact: true }).click();
  check(await page.locator('#source-list article').count() === 5, 'dated sources remain available');
  await page.getByRole('button', { name: '关闭数据说明' }).click();

  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const act of ['lobby', 'registration', 'awards', 'report', 'interruption', 'refusal', 'finale']) {
      await page.evaluate((name) => window.__product.showAct(name), act);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px ${act}: no horizontal overflow`);
    }
  }
  check(errors.length === 0, 'no JavaScript page errors');
  return { passed, errors };
}
