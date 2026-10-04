/** ABInfo Google Apps Script integration.
 * Deploy as Web App under the ABInfo Google account.
 * Set SCRIPT_SECRET in Project Settings > Script properties.
 */
const CONFIG = {
  SPREADSHEET_ID: '11PqHIHH_uydQ40GF6RpkeohWBCj0P8Bjnx-2XnK4VsA',
  FORM_ID: '1MeXGHFoIhgA8ToVTtrL3OFgtecZiM1IV7zw-QrPMiRU',
  SHEETS: ['Products','Orders','Customers','Order_Items','Categories','Statistics','Settings']
};
function setup() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const headers = {
    Products:['id','sku','name_ar','name_fr','name_en','category_id','price','sale_price','images','published','seo_title','seo_description'],
    Orders:['order_no','customer_id','items_json','subtotal','delivery_fee','total','status','payment_method','notes','created_at'],
    Customers:['id','full_name','phone','wilaya','commune','address','created_at'],
    Order_Items:['order_no','product_id','sku','name','qty','unit','total'],
    Categories:['id','name_ar','name_fr','name_en'],
    Statistics:['date','orders','revenue','average_order'],
    Settings:['key','value']
  };
  CONFIG.SHEETS.forEach(name=>{let sh=ss.getSheetByName(name)||ss.insertSheet(name);if(sh.getLastRow()===0)sh.appendRow(headers[name]);sh.setFrozenRows(1);});
  return 'ABInfo sheets ready';
}
function doGet(){return ContentService.createTextOutput(JSON.stringify({ok:true,service:'ABInfo Google Integration'})).setMimeType(ContentService.MimeType.JSON);}
function doPost(e){
  try{
    const secret=PropertiesService.getScriptProperties().getProperty('SCRIPT_SECRET');
    if(secret && (e.parameter.secret||'')!==secret) throw new Error('Unauthorized');
    const body=JSON.parse(e.postData.contents||'{}');
    const ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    if(body.type==='order') return json(syncOrder(ss,body));
    if(body.type==='product') return json(appendObject(ss,'Products',body.data));
    return json({ok:false,error:'Unknown event'});
  }catch(err){return json({ok:false,error:String(err.message||err)})}
}
function syncOrder(ss,b){
  const o=b.order||b.data||{};const sh=ss.getSheetByName('Orders');
  const values=sh.getDataRange().getValues();const orderNo=o.order_no;
  if(values.some(r=>String(r[0])===String(orderNo))) return {ok:true,duplicate:true,order_no:orderNo};
  sh.appendRow([orderNo,o.customer_id||'',o.items_json||JSON.stringify(o.items||[]),o.subtotal||0,o.delivery_fee||0,o.total||0,o.status||'new',o.payment_method||'cash_on_delivery',o.notes||'',o.created_at||new Date()]);
  if(o.customer) appendObject(ss,'Customers',o.customer);
  (o.items||[]).forEach(i=>ss.getSheetByName('Order_Items').appendRow([orderNo,i.id||'',i.sku||'',i.name||i.name_ar||'',i.qty||1,i.unit||0,i.total||0]));
  return {ok:true,order_no:orderNo};
}
function appendObject(ss,sheetName,obj){const sh=ss.getSheetByName(sheetName);if(!sh)throw new Error('Missing sheet '+sheetName);const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];sh.appendRow(headers.map(h=>obj[h]??''));return {ok:true};}
function json(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function installFormTrigger(){
  const form=FormApp.openById(CONFIG.FORM_ID);
  ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create();
}
function onFormSubmit(e){
  const ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);const sh=ss.getSheetByName('Settings');
  if(sh) sh.appendRow(['last_form_submission',new Date()]);
}
