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
    nav: { schedule: 'Schedule', today: 'Today', score: 'Score', review: 'Review', report: 'Report', suggestions: 'Suggestions', suggest: 'Suggestions', draft: 'AI Draft', tasks: 'Tasks' },
    login: { title: 'Schedule · Sidework', enterPin: 'Enter PIN', enter: 'Enter', demo: 'Demo PINs: Manager 123456 · Anna 1111 · Ben 2222 · Chris 3333', wrongPin: 'Wrong PIN' },
    loading: 'Loading…',
    schedule: {
      title: 'Weekly Schedule', module: 'Schedule module, independent', weekStarting: 'Week starting',
      newDraftNote: 'New schedules are drafts first, publish to make them visible.',
      addTitle: 'Add Schedule (Manager only)', add: 'Add Schedule', publish: 'Publish Week',
      customTitle: 'Add Custom Shift (Manager only)', customNameEn: 'Shift name (English)', customNameZh: 'Shift name (Chinese, optional)',
      clickToEdit: 'Click a cell to edit, like a spreadsheet.', done: 'Done', remove: 'Remove',
      startTime: 'Start time', endTime: 'End time', toClosing: 'To closing', addShift: 'Add Shift',
      quick: 'Quick add: 14:00 / 15:00 / 16:00 to closing',
      employee: 'Employee', unpublished: 'Unpublished', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
    today: {
      title: "Today's Sidework", managerNote: 'Managers, please go to Review. Staff complete today\'s checklist here.',
      assignedNote: 'Only your assigned tasks are shown today.', allNote: 'No assignments today, showing the full checklist.',
      group: 'Group',
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
      screen: 'AI Screen Photo', screening: 'Screening…',
    },
    score: {
      myTitle: 'My Score', todayScore: "Today's score", completion: 'Completion', approval: 'Approval rate', ontime: 'On-time rate',
      completed: 'Completed', items: 'items', reviewed: 'Reviewed', passed: 'Passed', late: 'Late',
      rollingNote: '14-day rolling score: average of daily scores on days with records. Two consecutive weeks below 70 trigger a reduction suggestion.',
      rollingTitle: '14-day rolling score', daysWithRecords: 'days with records', noRecord: 'No record in 14 days',
      allTitle: 'All Scores (Manager only)', employee: 'Employee',
    },
    report: {
      title: 'Daily AI Summary Report (Manager only)',
      note: 'Rule-based version generates text first; photo screening is step 2, flags uncertain only.',
      regenerate: "Regenerate Today's Report", email: 'Email Report to Manager', emailSent: 'Sent', emailPreview: 'Preview only (SMTP not configured)',
    },
    tasks: {
      title: 'Sidework Tasks & Daily Assignment (Manager only)',
      addTitle: 'Add a task', group: 'Group', titleEn: 'Task name (English)', titleZh: 'Task name (Chinese, optional)',
      photoRequired: 'Photo / video required', add: 'Add Task', delete: 'Delete', onShift: 'On shift today', notOnShift: 'Not on shift',
      assignTitle: 'Assign for a day', date: 'Date', employee: 'Employee', saveAssign: 'Save Assignment', saved: 'Assignment saved.',
      assignedCount: 'assigned', emptyAssign: 'No tasks assigned to this employee on this day yet.',
      collapseAll: 'Collapse all groups', expandAll: 'Expand all groups',
      note: 'Tasks rarely change, but the manager can add or delete them. Deleting only deactivates a task, history is kept. Once anyone is assigned on a day, that day runs on assignments only.',
    },
    draft: {
      title: 'AI Draft Schedule (Manager only)', note: 'Say one requirement, e.g. Anna Wednesday Dinner, Ben Friday Lunch. AI drafts with a reason per entry. Approving only creates schedule drafts — you still publish the week. Rejecting creates nothing.',
      requirementPlaceholder: 'Anna Wednesday Dinner, Ben Friday Lunch',
      weekStarting: 'Week starting', generate: 'Generate Draft', approve: 'Approve (create drafts)', reject: 'Reject', remove: 'Remove',
      approved: 'Approved — drafts created, go to Schedule and Publish Week.', rejected: 'Rejected — nothing created.',
      empty: 'No drafts yet.', status: 'Status', reason: 'Reason', warnings: 'Warnings',
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
      title: 'Schedule Suggestions — Adopt or Edit, then Apply to Schedule',
      note: 'Schedule module reads the Sidework score once, then suggests. Nothing changes until you press Adopt. You can change the action, week, date and shift first, then Apply. Reduce by half day = cancel one shift; reduce by one day = cancel all shifts that day.',
      employee: 'Employee', score: "Today's Score", suggestion: 'Suggestion',
      action: 'Action', keep: 'Keep schedule', talk: 'Talk first (no change)', reduceHalf: 'Reduce half day (1 shift)', reduceDay: 'Reduce one day (all that day)',
      week: 'Week starting', date: 'Date', shift: 'Shift to remove', adopt: 'Adopt / Apply to Schedule',
      applied: 'Applied', cancelled: 'shift(s) cancelled', noShift: 'No shift found for this employee in the selected week.',
    },
  },
  zh: {
    appName: '排班 · Sidework',
    appSub: '排班 · Sidework，两个独立模块',
    my: '我的', manager: '经理', staff: '员工', logout: '退出',
    nav: { schedule: '排班', today: '今日', score: '分数', review: '复核', report: '报告', suggestions: '建议', suggest: '建议', draft: 'AI 起草', tasks: '任务分配' },
    login: { title: '排班 · Sidework', enterPin: '输入 PIN', enter: '进入', demo: '演示 PIN：经理 123456 · Anna 1111 · Ben 2222 · Chris 3333', wrongPin: 'PIN 不对' },
    loading: '加载中…',
    schedule: {
      title: '本周排班', module: '排班模块，独立', weekStarting: '周起始',
      newDraftNote: '新增后先是未发布，点“发布本周”员工才看得到。',
      addTitle: '新增排班（仅经理）', add: '新增排班', publish: '发布本周',
      customTitle: '新增自定义班次（仅经理）', customNameEn: '班次名（英文）', customNameZh: '班次名（中文，可选）',
      clickToEdit: '点表格里的格子就能直接改，像 Excel 一样。', done: '完成', remove: '删除',
      startTime: '开始时间', endTime: '结束时间', toClosing: '到关门', addShift: '新增班次',
      quick: '快捷新增：14:00 / 15:00 / 16:00 到关门',
      employee: '员工', unpublished: '未发布', days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    today: {
      title: '今日 Sidework', managerNote: '经理请去“复核”页。员工登录后在这里做自己当天的清单。',
      assignedNote: '今天只显示经理分配给你的任务。', allNote: '今天没有分配，显示全部清单。',
      group: '组',
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
      screen: 'AI 预筛照片', screening: '预筛中…',
    },
    score: {
      myTitle: '我的分数', todayScore: '当日分', completion: '完成率', approval: '复核通过率', ontime: '准时率',
      completed: '完成', items: '项', reviewed: '已复核', passed: '通过', late: '迟交',
      rollingNote: '14 天滚动分：有记录的日子当日分的平均值。连续两周低于 70 才建议减班。',
      rollingTitle: '14 天滚动分', daysWithRecords: '天有记录', noRecord: '14 天内无记录',
      allTitle: '全员分数（经理可见）', employee: '员工',
    },
    report: {
      title: '每日 AI 总结报告（经理可见）',
      note: '规则版先生成文字；视觉判照片是第二步，只标存疑、不直接判不合格。',
      regenerate: '重新生成今日报告', email: '把报告发邮件给经理', emailSent: '已发送', emailPreview: '仅预览（未配 SMTP，未发送）',
    },
    tasks: {
      title: 'Sidework 任务与每日分配（经理可见）',
      addTitle: '新增任务', group: '分组', titleEn: '任务名（英文）', titleZh: '任务名（中文，可选）',
      photoRequired: '必传照片 / 视频', add: '新增任务', delete: '删除', onShift: '当天上班', notOnShift: '当天不上班',
      assignTitle: '按天分配', date: '日期', employee: '员工', saveAssign: '保存分配', saved: '分配已保存。',
      assignedCount: '项已分配', emptyAssign: '该员工这天还没有被分配任务。',
      collapseAll: '全部收起', expandAll: '全部展开',
      note: 'Sidework 平时不太变，但经理可以增删。删除只是停用，历史记录保留。当天只要有人被分配，这天就只按分配走。',
    },
    draft: {
      title: 'AI 起草排班（经理可见）', note: '说一句话需求，例如：Anna 周三 Dinner，Ben 周五 Lunch。AI 每条带理由起草。批准只生成排班草稿，还要去排班页发布；驳回不生成任何排班。',
      requirementPlaceholder: 'Anna 周三 Dinner，Ben 周五 Lunch',
      weekStarting: '周起始', generate: '生成草稿', approve: '批准（生成草稿）', reject: '驳回', remove: '删除',
      approved: '已批准——草稿已生成，去排班页点发布本周。', rejected: '已驳回——没有生成排班。',
      empty: '暂无草稿。', status: '状态', reason: '理由', warnings: '未读懂',
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
      title: '排班建议——可直接采用，也可改完再应用到排班',
      note: '排班模块读一次 Sidework 分数后给出建议。没点采用之前什么都不会变；你可以先改动作、周、日期和班次，再点应用。减半天 = 取消 1 个班次；减一天 = 取消当天全部班次。',
      employee: '员工', score: '当日分', suggestion: '建议',
      action: '动作', keep: '正常排班', talk: '先谈话（不改排班）', reduceHalf: '减半天（取消 1 个班次）', reduceDay: '减一天（取消当天全部班次）',
      week: '周起始', date: '日期', shift: '要取消的班次', adopt: '采用并应用到排班',
      applied: '已应用', cancelled: '个班次已取消', noShift: '所选周内该员工没有可减的班次。',
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
