// Language switch: EN / 中文, two buttons, default English, saved in localStorage.
// All UI chrome is single-language per the selected language. Data titles stored as
// "English || 中文" are split by displayText() so they also switch fully.
export function getLang() { return localStorage.getItem('pos-lang') === 'zh' ? 'zh' : 'en' }
export function setLang(l) { localStorage.setItem('pos-lang', l) }

export function displayText(text, lang) {
  if (!text) return ''
  const parts = String(text).split(' || ')
  if (parts.length === 2) return lang === 'zh' ? parts[1] : parts[0]
  return text
}

const T = {
  en: {
    appName: 'Schedule · Sidework',
    appSub: 'Schedule & Sidework, two independent modules',
    my: 'My', manager: 'Manager', staff: 'Staff', logout: 'Logout',
    nav: { schedule: 'Schedule', today: 'Today', score: 'Score', review: 'Review', report: 'Report', suggestions: 'Suggestions' },
    login: { title: 'Schedule · Sidework', enterPin: 'Enter PIN', enter: 'Enter', demo: 'Demo PINs: Manager 123456 · Anna 1111 · Ben 2222 · Chris 3333', wrongPin: 'Wrong PIN' },
    loading: 'Loading…',
    schedule: {
      title: 'Weekly Schedule', module: 'Schedule module, independent', weekStarting: 'Week starting',
      newDraftNote: 'New schedules are drafts first, publish to make them visible.',
      addTitle: 'Add Schedule (Manager only)', add: 'Add Schedule', publish: 'Publish Week',
      employee: 'Employee', unpublished: 'Unpublished', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
    today: {
      title: "Today's Sidework", managerNote: 'Managers, please go to Review. Staff complete today\'s checklist here.',
      photoNote: 'Photo/video required items must upload before marking complete.',
      categories: { opening: 'Opening', running: 'Running', closing: 'Closing' },
      approved: 'Approved', rejected: 'Rejected', pendingReview: 'Pending Review', pending: 'Pending',
      photoRequired: 'Photo/Video Required', uploadedFile: 'Uploaded file', notePlaceholder: 'Note (optional)',
      markComplete: 'Mark Complete',
    },
    review: {
      title: 'Manager Review', module: 'Sidework module, independent', empty: 'No pending reviews.',
      late: 'Late', file: 'File', note: 'Note', none: 'None',
      rejectPlaceholder: 'Rejection reason (required when rejecting)',
      approve: 'Approve', reject: 'Reject', markLate: 'Mark Late',
    },
    score: {
      myTitle: 'My Score', todayScore: "Today's score", completion: 'Completion', approval: 'Approval rate', ontime: 'On-time rate',
      completed: 'Completed', items: 'items', reviewed: 'Reviewed', passed: 'Passed', late: 'Late',
      rollingNote: 'Full version uses a 14-day rolling average, two consecutive weeks below 70 trigger a reduction suggestion.',
      allTitle: 'All Scores (Manager only)', employee: 'Employee',
    },
    report: {
      title: 'Daily AI Summary Report (Manager only)',
      note: 'Rule-based version generates text first; photo screening is step 2, flags uncertain only.',
      regenerate: "Regenerate Today's Report",
    },
    profile: {
      title: 'Profile', language: 'Language', languageNote: 'Tap EN for all English, tap Chinese for all Chinese. Your choice is saved.',
      name: 'Name', role: 'Role', back: 'Back',
      account: 'My Account', loginMethod: 'Login method', pinLogin: 'PIN login', status: 'Status', active: 'Active',
      myScore: 'My Score Today', completed: 'Completed today', reviewed: 'Reviewed', passed: 'Passed',
      myWeek: 'My Shifts This Week', publishedShifts: 'published shifts',
      canDo: 'What I Can Do', cannotDo: 'What I Cannot Do',
      empCan: ['View only my own schedule', 'Do today\'s sidework and upload photo / video evidence', 'View only my own score', 'Change language in this profile'],
      empCannot: ['View other staff schedules or scores', 'Edit or publish schedules', 'Review other staff sidework', 'See or change pay rates', 'See anyone\'s PIN (PINs are hashed)'],
      team: 'Team Overview', activeStaff: 'active staff', pendingReviews: 'pending reviews', teamScoreNote: 'Scores and reviews are in the Score / Review pages.',
      mgrCan: ['Create and publish schedules', 'Review sidework (approve / reject / mark late)', 'View all staff scores', 'Generate the daily report', 'View schedule suggestions (approval required before any change)'],
      mgrCannot: ['Let AI publish, reduce, fail, message or deduct pay automatically — every AI action needs manager approval', 'See anyone\'s PIN (PINs are hashed)'],
      future: 'Not in the system yet — manager fills this in later', phone: 'Phone', emergency: 'Emergency contact', hireDate: 'Hire date', payRate: 'Hourly rate',
    },
    suggest: {
      title: 'Next Week Schedule Suggestions (Read-only, does not change the schedule directly)',
      note: 'Schedule module reads the Sidework score once, then suggests, manager approval required. Reduce by half day = one fewer shift; reduce by one day = no shifts that day.',
      employee: 'Employee', score: "Today's Score", suggestion: 'Suggestion',
    },
  },
  zh: {
    appName: '排班 · Sidework',
    appSub: '排班 · Sidework，两个独立模块',
    my: '我的', manager: '经理', staff: '员工', logout: '退出',
    nav: { schedule: '排班', today: '今日', score: '分数', review: '复核', report: '报告', suggestions: '建议' },
    login: { title: '排班 · Sidework', enterPin: '输入 PIN', enter: '进入', demo: '演示 PIN：经理 123456 · Anna 1111 · Ben 2222 · Chris 3333', wrongPin: 'PIN 不对' },
    loading: '加载中…',
    schedule: {
      title: '本周排班', module: '排班模块，独立', weekStarting: '周起始',
      newDraftNote: '新增后先是未发布，点“发布本周”员工才看得到。',
      addTitle: '新增排班（仅经理）', add: '新增排班', publish: '发布本周',
      employee: '员工', unpublished: '未发布', days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    today: {
      title: '今日 Sidework', managerNote: '经理请去“复核”页。员工登录后在这里做自己当天的清单。',
      photoNote: '必传项必须传照片或视频才能点完成。',
      categories: { opening: '开店', running: '进行中', closing: '打烊' },
      approved: '复核通过', rejected: '打回', pendingReview: '待复核', pending: '待做',
      photoRequired: '必传照片/视频', uploadedFile: '已传文件', notePlaceholder: '备注（可选）',
      markComplete: '标记完成',
    },
    review: {
      title: '经理复核', module: 'Sidework 检查模块，独立', empty: '暂无待复核记录。',
      late: '迟交', file: '文件', note: '备注', none: '无',
      rejectPlaceholder: '打回原因（打回时必填一句话）',
      approve: '通过', reject: '打回', markLate: '标迟交',
    },
    score: {
      myTitle: '我的分数', todayScore: '当日分', completion: '完成率', approval: '复核通过率', ontime: '准时率',
      completed: '完成', items: '项', reviewed: '已复核', passed: '通过', late: '迟交',
      rollingNote: '正式版按最近 14 天平均算滚动分，连续两周低于 70 才建议减班。',
      allTitle: '全员分数（经理可见）', employee: '员工',
    },
    report: {
      title: '每日 AI 总结报告（经理可见）',
      note: '规则版先生成文字；视觉判照片是第二步，只标存疑、不直接判不合格。',
      regenerate: '重新生成今日报告',
    },
    profile: {
      title: '个人资料', language: '语言', languageNote: '点 EN 全英文，点中文全中文。你的选择会被记住。',
      name: '姓名', role: '身份', back: '返回',
      account: '我的账号', loginMethod: '登录方式', pinLogin: 'PIN 登录', status: '状态', active: '在职',
      myScore: '我今天的分数', completed: '今天完成', reviewed: '已复核', passed: '通过',
      myWeek: '我本周的班', publishedShifts: '个已发布班次',
      canDo: '我可以做什么', cannotDo: '我不可以做什么',
      empCan: ['只看自己的排班', '做当天的 sidework，传照片 / 视频作证据', '只看自己的分数', '在这个 Profile 里换语言'],
      empCannot: ['看其他员工的排班或分数', '改排班或发布排班', '复核其他员工的 sidework', '看或改工资', '看任何人的 PIN（PIN 只存哈希）'],
      team: '团队总览', activeStaff: '名在职员工', pendingReviews: '条待复核', teamScoreNote: '分数和复核详情在分数 / 复核页里看。',
      mgrCan: ['新建和发布排班', '复核 sidework（通过 / 打回 / 标迟交）', '看全员分数', '生成每日报告', '看排班建议（任何改动都要经理确认才生效）'],
      mgrCannot: ['让 AI 自动发布、减班、判不合格、发消息或扣钱——所有 AI 动作都要经理确认', '看任何人的 PIN（PIN 只存哈希）'],
      future: '系统里还没有——以后由经理补填', phone: '电话', emergency: '紧急联系人', hireDate: '入职日期', payRate: '时薪',
    },
    suggest: {
      title: '下周排班建议（只读建议，不直接改排班表）',
      note: '排班模块读一次 Sidework 分数后给出建议，经理确认后才生效。减半天 = 少一个班次；减一天 = 当天全部班次都不排。',
      employee: '员工', score: '当日分', suggestion: '建议',
    },
  },
}

export function t(lang, path) {
  const parts = path.split('.')
  let cur = T[lang] || T.en
  for (const p of parts) { cur = cur?.[p]; if (cur === undefined) return path }
  return cur
}
export function dict(lang) { return T[lang] || T.en }
