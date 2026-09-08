import test from 'node:test';
import assert from 'node:assert/strict';
import {createIntake,addTranscript,capture,prepareReview,formatReview} from '../public/intake.mjs';
test('the review shown to the caller contains every field and the latest corrected time',()=>{
  const state=createIntake();
  for(const [field,value] of Object.entries({service:'Install fan',equipment:'Cooker hood',area:'London',access:'Second floor',window:'Friday afternoon'})){
    addTranscript(state,value);capture(state,{field,value,status:'known',evidence:value});
  }
  prepareReview(state);addTranscript(state,'Monday morning');capture(state,{field:'window',value:'Monday morning',status:'known',evidence:'Monday morning'});
  const displayed=formatReview(prepareReview(state));
  for(const expected of ['Requested work: Install fan','Equipment or property: Cooker hood','Service area: London','Access constraints: Second floor','Preferred time: Monday morning'])assert.ok(displayed.includes(expected));
  assert.doesNotMatch(displayed,/Friday/);
});
