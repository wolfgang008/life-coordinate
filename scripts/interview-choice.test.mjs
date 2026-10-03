import test from 'node:test';
import assert from 'node:assert/strict';
import {interviewQuestions, interviewReadiness, sampleChoiceInput, updateInterviewAnswer} from '../public/domain/stages.js';
import {cleanAnswers} from '../public/domain/contracts.js';
import {decodeState,emptyState} from '../public/app/state.js';
import {homeView} from '../public/views/home.js';
import {interviewView} from '../public/views/interview.js';

test('结构化选择题覆盖五阶段，完成选择后不要求文字经历', () => {
  for (const stage of ['school','early','junior','senior','graduate']) {
    const answers = sampleChoiceInput(stage);
    assert.equal(interviewReadiness(answers).ready, true, stage);
    assert.doesNotThrow(() => cleanAnswers(answers), stage);
    assert.equal(answers.experience, undefined, stage);
  }
});

test('回答会开启与处境有关的追问', () => {
  let answers = {stage:'senior', concern:'升学与就业如何取舍', interviewVersion:1};
  const current = interviewQuestions(answers).find(q => q.id === 'currentSituation');
  answers = updateInterviewAnswer(answers, current, '正在求职 / 已有 offer 需要取舍');
  assert.ok(interviewQuestions(answers).some(q => q.id === 'offer'));
  const family = interviewQuestions(answers).find(q => q.id === 'familyContext');
  answers = updateInterviewAnswer(answers, family, '希望稳定、留在熟悉的地方');
  const mobility = interviewQuestions(answers).find(q => q.id === 'mobility');
  answers = updateInterviewAnswer(answers, mobility, '愿意去更大的城市尝试');
  assert.ok(interviewQuestions(answers).some(q => q.id === 'familyBinding'));
});

test('早期阶段不出现毕业求职专属问题', () => {
  for (const stage of ['school','early']) {
    const ids = interviewQuestions({stage, concern:'还不知道喜欢什么'}).map(q => q.id);
    assert.equal(ids.includes('internship'), false);
    assert.equal(ids.includes('offer'), false);
    assert.equal(ids.includes('research'), false);
  }
});

test('新访谈从阶段选择开始，选定后当前困扰随阶段变化', () => {
  let answers={interviewVersion:1};
  const first=interviewQuestions(answers);
  assert.deepEqual(first.map(q=>q.id),['stage']);
  assert.equal(interviewReadiness(answers).ready,false);
  assert.match(interviewView({...emptyState(),answers}),/你现在处在哪一段/);
  answers=updateInterviewAnswer(answers,first[0],'graduate');
  const questions=interviewQuestions(answers);
  assert.equal(questions[1].id,'concern');
  assert.ok(questions[1].options.includes('怎样兼顾收入和学习'));
  assert.doesNotMatch(homeView(emptyState(),{ready:true}),/data-stage|data-concern/);
});

test('修改阶段清理不适用的旧答案，保留通用背景与文字补充', () => {
  let answers=sampleChoiceInput('senior');
  answers={...answers,offer:'已有明确 offer，可比较条件',experience:'我在日常任务里更愿意整理需求。'};
  answers=updateInterviewAnswer(answers,interviewQuestions(answers)[0],'school');
  assert.equal(answers.stage,'school');
  for(const key of ['concern','education','currentSituation','income','internship','offer','research'])assert.equal(answers[key],undefined,key);
  assert.equal(answers.city,'西安');
  assert.equal(answers.experience,'我在日常任务里更愿意整理需求。');
  assert.equal(interviewReadiness(answers).ready,false);
});

test('旧访谈和案例备份进度迁移两题且只迁移一次', () => {
  const state={...emptyState(),answers:sampleChoiceInput('senior'),index:4};
  delete state.interviewLayout;
  state.sampleBackup={answers:sampleChoiceInput('early'),index:2};
  const upgraded=decodeState(JSON.stringify(state));
  assert.equal(upgraded.index,6);
  assert.equal(upgraded.sampleBackup.index,4);
  assert.equal(interviewQuestions(upgraded.answers)[upgraded.index].id,'internship');
  assert.equal(decodeState(JSON.stringify(upgraded)).index,6);
});
