import type { Exercise, WorkoutTemplate } from './types'

type E = [string, string, Exercise['primaryMuscles'], Exercise['secondaryMuscles'], Exercise['equipment'], boolean?]

const EXERCISES: E[] = [
  // 胸
  ['杠铃平板卧推', 'Barbell Bench Press', ['胸'], ['三头', '肩'], '杠铃'],
  ['杠铃上斜卧推', 'Incline Barbell Press', ['胸'], ['肩', '三头'], '杠铃'],
  ['杠铃下斜卧推', 'Decline Barbell Press', ['胸'], ['三头'], '杠铃'],
  ['哑铃平板卧推', 'Dumbbell Bench Press', ['胸'], ['三头'], '哑铃'],
  ['哑铃上斜卧推', 'Incline Dumbbell Press', ['胸'], ['肩'], '哑铃'],
  ['哑铃飞鸟', 'Dumbbell Fly', ['胸'], [], '哑铃'],
  ['上斜哑铃飞鸟', 'Incline Dumbbell Fly', ['胸'], [], '哑铃'],
  ['绳索夹胸', 'Cable Fly', ['胸'], [], '绳索'],
  ['器械推胸', 'Machine Chest Press', ['胸'], ['三头'], '器械'],
  ['器械夹胸', 'Machine Fly', ['胸'], [], '器械'],
  ['双杠臂屈伸', 'Dips', ['胸'], ['三头', '肩'], '自重'],
  ['俯卧撑', 'Push-Up', ['胸'], ['三头', '核心'], '自重'],
  ['史密斯卧推', 'Smith Machine Press', ['胸'], ['三头'], '器械'],
  // 背
  ['引体向上', 'Pull-Up', ['背'], ['二头'], '自重'],
  ['高位下拉', 'Lat Pulldown', ['背'], ['二头'], '器械'],
  ['杠铃划船', 'Barbell Row', ['背'], ['二头', '斜方'], '杠铃'],
  ['上斜哑铃划船', 'Chest-Supported Row', ['背'], ['二头'], '哑铃'],
  ['单臂哑铃划船', 'One-Arm Dumbbell Row', ['背'], ['二头'], '哑铃', true],
  ['绳索划船', 'Cable Row', ['背'], ['二头'], '绳索'],
  ['器械划船', 'Machine Row', ['背'], ['二头'], '器械'],
  ['直臂下压', 'Straight-Arm Pulldown', ['背'], ['三头'], '绳索'],
  ['面拉', 'Face Pull', ['背'], ['肩'], '绳索'],
  ['反手引体', 'Chin-Up', ['背'], ['二头'], '自重'],
  ['T杠划船', 'T-Bar Row', ['背'], ['二头'], '器械'],
  ['山羊挺身', 'Back Extension', ['背'], ['腿'], '自重'],
  // 肩
  ['杠铃推举', 'Overhead Press', ['肩'], ['三头'], '杠铃'],
  ['哑铃推举', 'Dumbbell Shoulder Press', ['肩'], ['三头'], '哑铃'],
  ['阿诺德推举', 'Arnold Press', ['肩'], ['三头'], '哑铃'],
  ['侧平举', 'Lateral Raise', ['肩'], [], '哑铃'],
  ['绳索侧平举', 'Cable Lateral Raise', ['肩'], [], '绳索', true],
  ['前平举', 'Front Raise', ['肩'], ['胸'], '哑铃'],
  ['俯身飞鸟', 'Reverse Fly', ['肩'], ['背'], '哑铃'],
  ['器械推举', 'Machine Shoulder Press', ['肩'], ['三头'], '器械'],
  ['杠铃耸肩', 'Barbell Shrug', ['斜方'], ['肩'], '杠铃'],
  ['哑铃耸肩', 'Dumbbell Shrug', ['斜方'], [], '哑铃'],
  ['杠铃前推', 'Landmine Press', ['肩'], ['三头', '胸'], '杠铃', true],
  // 腿
  ['杠铃深蹲', 'Barbell Squat', ['腿'], ['臀', '核心'], '杠铃'],
  ['前蹲', 'Front Squat', ['腿'], ['背', '核心'], '杠铃'],
  ['罗马尼亚硬拉', 'Romanian Deadlift', ['腿'], ['背', '臀'], '杠铃'],
  ['传统硬拉', 'Conventional Deadlift', ['腿'], ['背', '斜方'], '杠铃'],
  ['相扑硬拉', 'Sumo Deadlift', ['腿'], ['臀', '背'], '杠铃'],
  ['腿举', 'Leg Press', ['腿'], ['臀'], '器械'],
  ['哑铃箭步蹲', 'Dumbbell Lunge', ['腿'], ['臀'], '哑铃'],
  ['保加利亚分腿蹲', 'Bulgarian Split Squat', ['腿'], ['臀'], '哑铃', true],
  ['腿屈伸', 'Leg Extension', ['腿'], [], '器械'],
  ['腿弯举', 'Leg Curl', ['腿'], [], '器械'],
  ['站姿提踵', 'Standing Calf Raise', ['小腿'], [], '器械'],
  ['坐姿提踵', 'Seated Calf Raise', ['小腿'], [], '器械'],
  ['哈克深蹲', 'Hack Squat', ['腿'], ['臀'], '器械'],
  ['臀桥', 'Hip Thrust', ['臀'], ['腿'], '杠铃'],
  ['杠铃臀推', 'Barbell Hip Thrust', ['臀'], ['腿'], '杠铃'],
  ['自重深蹲', 'Bodyweight Squat', ['腿'], [], '自重'],
  ['跳箱', 'Box Jump', ['腿'], ['臀'], '自重'],
  // 二头
  ['杠铃弯举', 'Barbell Curl', ['二头'], [], '杠铃'],
  ['哑铃弯举', 'Dumbbell Curl', ['二头'], [], '哑铃'],
  ['锤式弯举', 'Hammer Curl', ['二头'], [], '哑铃'],
  ['上斜哑铃弯举', 'Incline Dumbbell Curl', ['二头'], [], '哑铃'],
  ['绳索弯举', 'Cable Curl', ['二头'], [], '绳索'],
  ['器械弯举', 'Machine Curl', ['二头'], [], '器械'],
  ['集中弯举', 'Concentration Curl', ['二头'], [], '哑铃', true],
  // 三头
  ['绳索下压', 'Cable Pushdown', ['三头'], [], '绳索'],
  ['仰卧杠铃臂屈伸', 'Skull Crusher', ['三头'], [], '杠铃'],
  ['哑铃颈后臂屈伸', 'Overhead Dumbbell Extension', ['三头'], [], '哑铃'],
  ['绳索颈后臂屈伸', 'Overhead Cable Extension', ['三头'], [], '绳索'],
  ['窄距卧推', 'Close-Grip Bench Press', ['三头'], ['胸'], '杠铃'],
  ['哑铃臂屈伸', 'Dumbbell Kickback', ['三头'], [], '哑铃', true],
  ['器械臂屈伸', 'Machine Triceps Extension', ['三头'], [], '器械'],
  ['凳上反屈伸', 'Bench Dip', ['三头'], ['胸'], '自重'],
  // 核心
  ['悬垂举腿', 'Hanging Leg Raise', ['核心'], [], '自重'],
  ['卷腹', 'Crunch', ['核心'], [], '自重'],
  ['平板支撑', 'Plank', ['核心'], [], '自重'],
  ['绳索卷腹', 'Cable Crunch', ['核心'], [], '绳索'],
  ['负重卷腹', 'Weighted Sit-Up', ['核心'], [], '杠铃'],
]

export function seedExercises(): Exercise[] {
  return EXERCISES.map(([nameZh, nameEn, primaryMuscles, secondaryMuscles, equipment, unilateral], i) => ({
    id: `ex-${i + 1}`,
    nameZh,
    nameEn,
    primaryMuscles,
    secondaryMuscles,
    equipment,
    unilateral: unilateral ?? false,
    custom: false,
  }))
}

export function seedTemplates(exercises: Exercise[]): WorkoutTemplate[] {
  const find = (zh: string) => exercises.find((e) => e.nameZh === zh)!.id
  const ex = (zh: string, targetSets: number, targetReps: string, restSec?: number, supersetGroupId?: string) => ({
    exerciseId: find(zh),
    targetSets,
    targetReps,
    restSec,
    supersetGroupId,
  })
  return [
    {
      id: 'tpl-chest-biceps',
      name: '胸 + 二头',
      builtin: true,
      sort: 0,
      exercises: [
        ex('杠铃平板卧推', 4, '6-8', 150),
        ex('哑铃上斜卧推', 3, '8-10', 120),
        ex('绳索夹胸', 3, '12-15', 90),
        ex('双杠臂屈伸', 2, '8-12', 90),
        ex('杠铃弯举', 3, '8-10', 90, 'ss-a'),
        ex('锤式弯举', 3, '10-12', 90, 'ss-a'),
      ],
    },
    {
      id: 'tpl-back-triceps',
      name: '背 + 三头',
      builtin: true,
      sort: 1,
      exercises: [
        ex('引体向上', 4, '6-10', 150),
        ex('杠铃划船', 4, '8-10', 150),
        ex('高位下拉', 3, '10-12', 120),
        ex('绳索划船', 3, '10-12', 120),
        ex('绳索下压', 3, '10-12', 90, 'ss-a'),
        ex('仰卧杠铃臂屈伸', 3, '10-12', 90, 'ss-a'),
      ],
    },
    {
      id: 'tpl-shoulders',
      name: '肩',
      builtin: true,
      sort: 2,
      exercises: [
        ex('哑铃推举', 4, '8-10', 150),
        ex('杠铃推举', 3, '6-8', 150),
        ex('侧平举', 4, '12-15', 75),
        ex('俯身飞鸟', 3, '12-15', 75),
        ex('杠铃耸肩', 3, '10-12', 90),
      ],
    },
    {
      id: 'tpl-legs',
      name: '腿',
      builtin: true,
      sort: 3,
      exercises: [
        ex('杠铃深蹲', 4, '5-8', 180),
        ex('罗马尼亚硬拉', 3, '8-10', 150),
        ex('腿举', 3, '10-12', 150),
        ex('腿弯举', 3, '10-12', 90),
        ex('站姿提踵', 4, '12-15', 60),
      ],
    },
  ]
}

export async function seedIfEmpty(db: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  count: (storeName: any) => Promise<number>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put: (storeName: any, value: any) => Promise<unknown>
}): Promise<void> {
  if ((await db.count('exercises')) > 0) return
  const exercises = seedExercises()
  for (const e of exercises) await db.put('exercises', e)
  for (const t of seedTemplates(exercises)) await db.put('templates', t)
}
