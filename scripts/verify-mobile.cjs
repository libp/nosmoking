async(page)=>{
 const passed=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 const check=(condition,name)=>{if(!condition)throw new Error(name);passed.push(name);};
 const nav=name=>page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name,exact:true});
 await page.goto('http://127.0.0.1:5173/#calculator');
 for(const width of [320,360,390,430]){
  await page.setViewportSize({width,height:844});
  for(const name of ['身体账本','烟幕剧场','无烟游乐场','新的开始']){
   await nav(name).tap();
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px ${name}: no overflow`);
   const box=await nav(name).boundingBox();check(box.height>=44&&box.y+box.height<=844,`${width}px ${name}: reachable bottom navigation`);
  }
  await nav('身体账本').tap();
  check(await page.locator('[name=years]').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16),`${width}px legible input without focus zoom`);
 }
 await page.setViewportSize({width:390,height:844});await nav('身体账本').tap();
 await page.getByRole('button',{name:'详细计算',exact:true}).tap();await page.locator('[name=years]').fill('15');await page.locator('[name=age]').fill('40');await page.locator('[name=daily]').fill('20');await page.locator('[name=monthly]').fill('800');
 check((await page.locator('#spent').textContent()).includes('144,000'),'touch calculator updates');
 await page.getByRole('button',{name:'数据与算法 ↗'}).tap();check(await page.locator('#data-dialog').isVisible(),'mobile data dialog');await page.getByRole('button',{name:'关闭数据说明'}).tap();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'output/playwright/mobile-home-final.png'});
 await nav('无烟游乐场').tap();await page.getByRole('button',{name:'点燃虚拟香烟 ✦'}).tap();await page.getByRole('button',{name:'吸一口 · 屏幕模拟'}).tap();check((await page.locator('#puff-count').textContent()).includes('1'),'touch puff interaction');await page.screenshot({path:'output/playwright/mobile-game-final.png',fullPage:true});
 await nav('心脏实验室').tap();await page.waitForFunction(()=>window.__heartLab?.ready);await page.evaluate(()=>scrollTo(0,0));
 check(await page.locator('#scene').evaluate(el=>el.getBoundingClientRect().height===345),'3D touch surface limited to model');
 const cdp=await page.context().newCDPSession(page);
 const swipe=async(x,y,dx,dy)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 await swipe(45,280,0,-180);await page.waitForFunction(()=>scrollY>50);passed.push('native swipe scroll outside 3D model');
 await page.evaluate(()=>scrollTo(0,300));
 const before=await page.evaluate(()=>window.__heartLab.camera.position.toArray());
 await swipe(55,240,110,0);await page.waitForFunction(before=>Math.abs(window.__heartLab.camera.position.x-before[0])>.1,before);passed.push('touch drag rotates 3D model');
 const distance=await page.evaluate(()=>window.__heartLab.controls.getDistance());
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:145,y:290,id:1},{x:245,y:290,id:2}]});
 for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:145-i*7,y:290,id:1},{x:245+i*7,y:290,id:2}]});await page.waitForTimeout(25);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(d=>window.__heartLab.controls.getDistance()<d,distance);passed.push('two-finger pinch zooms heart');
 await page.getByRole('button',{name:'重置视角',exact:true}).tap();
 for(const width of [320,430,390]){await page.setViewportSize({width,height:844});await page.waitForTimeout(100);check(await page.locator('.hotspot').evaluateAll(nodes=>nodes.every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})),`${width}px anatomical labels stay on screen`);}
 await page.screenshot({path:'output/playwright/mobile-heart-final.png',fullPage:true});
 await page.getByRole('button',{name:'返回身体账本',exact:false}).tap();check(await nav('身体账本').isVisible(),'touch returns from heart');
 await page.goto('http://127.0.0.1:5173/mobile.html');check(await page.locator('iframe').isVisible(),'interactive phone preview loads');
 check(errors.length===0,'no mobile JavaScript errors');return {passed,errors};
}
