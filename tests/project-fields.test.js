const {test}=require('node:test');
const assert=require('node:assert/strict');
const {projectFields}=require('../services/projectFields');
const base={title:'Project',category:'Web Development',description:'Summary'};
test('project validation rejects invalid arrays, flags, URLs and crops',()=>{
  for(const fields of [{isFeatured:'yes'},{features:'not-json'},{features:JSON.stringify(['x'.repeat(201)])},{tags:Array(13).fill('React')},{imagePosition:'left'},{link:'https://user:pass@example.com'},{title:{$ne:null}}])assert.ok(Object.keys(projectFields({...base,...fields}).errors).length);
});
test('optional fields support old projects and projects without a live site',()=>{const result=projectFields(base);assert.deepEqual(result.errors,{});assert.equal(result.values.link,'');assert.equal(result.values.cardLabel,'');assert.equal(result.values.imagePosition,'center');assert.deepEqual(result.values.features,[]);});
