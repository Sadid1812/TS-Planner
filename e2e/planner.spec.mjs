import {test,expect} from '@playwright/test';

async function open(page){
 await page.goto('./');
 await expect(page.getByRole('heading',{name:'Make room for what matters.'})).toBeVisible();
 await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible();
}
async function addTask(page,title){
 await page.getByRole('button',{name:'Add task',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByRole('textbox',{name:'What would you like to do?'}).fill(title);
 await dialog.getByRole('button',{name:'Add task',exact:true}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page.getByRole('button',{name:`Complete ${title}`,exact:true})).toBeVisible();
 await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible();
}

test('first run is empty; tasks and notes survive reload and offline edits',async({page,context})=>{
 await open(page);
 await expect(page.locator('.task-row')).toHaveCount(0);
 await expect(page.locator('.completion')).toContainText('0 of 0 tasks');
 await expect(page.getByText('Sample tasks to explore your planner.',{exact:true})).toHaveCount(0);
 await addTask(page,'Acceptance task');
 await page.getByRole('textbox',{name:'Daily note',exact:true}).fill('Private note retained offline');
 await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('textbox',{name:'Daily note',exact:true})).toHaveValue('Private note retained offline');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
 await context.setOffline(true);
 await page.reload();
 await expect(page.getByRole('button',{name:'Complete Acceptance task',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Complete Acceptance task',exact:true}).click();
 await expect(page.locator('.completion')).toContainText('1 of 1 tasks');
 await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible();
 await context.setOffline(false);
 await page.reload();
 await expect(page.getByRole('button',{name:'Reopen Acceptance task',exact:true})).toBeVisible();
});

test('saved changes propagate to a second open window',async({page,context})=>{
 await open(page);
 const other=await context.newPage();
 await open(other);
 await addTask(page,'Shared device task');
 await expect(other.getByRole('button',{name:'Complete Shared device task',exact:true})).toBeVisible();
 await other.getByRole('textbox',{name:'Daily note',exact:true}).fill('Changed in second window');
 await expect(page.getByRole('textbox',{name:'Daily note',exact:true})).toHaveValue('Changed in second window');
});

test('phone layout, keyboard dialog and Spanish task controls',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await open(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.getByRole('button',{name:'Add task',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'What would you like to do?'})).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('combobox',{name:'Interface language',exact:true}).selectOption('es');
 await page.getByRole('button',{name:'Hoy',exact:true}).click();
 await page.getByRole('button',{name:'Añadir tarea',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByRole('textbox',{name:'¿Qué te gustaría hacer?'}).fill('Study {title} $&');
 await dialog.getByRole('textbox',{name:'Buscar iconos'}).fill('corazón');
 await expect(dialog.getByRole('button',{name:'Icono de Corazón',exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Icono de Corazón',exact:true}).click();
 await dialog.getByRole('button',{name:'Añadir tarea',exact:true}).click();
 await expect(page.getByRole('button',{name:'Completar Study {title} $&',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
