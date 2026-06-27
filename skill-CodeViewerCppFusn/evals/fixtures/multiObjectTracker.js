// multiObjectTracker.js - 多目标跟踪模块（高速场景）

class KalmanTracker {
  constructor(objectId, initialState) {
    this.objectId = objectId;
    // 状态向量: [x, y, vx, vy] — 使用 CV (Constant Velocity) 模型
    this.state = [
      initialState.x || 0,
      initialState.y || 0,
      initialState.vx || 0,
      initialState.vy || 0
    ];

    // 状态转移矩阵 (CV模型, dt = 50ms)
    this.dt = 0.05;
    this.F = [
      1, 0, this.dt, 0,
      0, 1, 0, this.dt,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];

    // 观测矩阵 — 仅观测位置 (x, y)
    this.H = [
      1, 0, 0, 0,
      0, 1, 0, 0
    ];

    // 状态协方差矩阵
    this.P = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 10, 0,
      0, 0, 0, 10
    ];

    // 过程噪声 — 固定值
    this.Q = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];

    // 观测噪声 — 固定值
    this.R = [
      0.5, 0,
      0, 0.5
    ];

    this.age = 0;           // 航迹存在帧数
    this.hitCount = 0;      // 关联成功的帧数
    this.missCount = 0;     // 连续未关联帧数
    this.confirmed = false;
    this.deleted = false;
  }

  // 预测步骤
  predict() {
    // state = F * state
    const s = this.state;
    const f = this.F;
    this.state = [
      f[0]*s[0] + f[1]*s[1] + f[2]*s[2] + f[3]*s[3],
      f[4]*s[0] + f[5]*s[1] + f[6]*s[2] + f[7]*s[3],
      f[8]*s[0] + f[9]*s[1] + f[10]*s[2] + f[11]*s[3],
      f[12]*s[0] + f[13]*s[1] + f[14]*s[2] + f[15]*s[3]
    ];
    // P = F * P * F' + Q
    this.updateCovariance();
  }

  // 更新步骤
  update(measurement) {
    // measurement: { x, y }
    const z = [measurement.x, measurement.y];
    // y = z - H * state (innovation)
    const y = [
      z[0] - this.state[0],
      z[1] - this.state[1]
    ];
    // 简化卡尔曼增益计算
    const kx = this.P[0] / (this.P[0] + this.R[0]);
    const ky = this.P[5] / (this.P[5] + this.R[3]);

    this.state[0] += kx * y[0];
    this.state[1] += ky * y[1];
    // 注意：此处未更新速度分量
  }

  updateCovariance() {
    // 简化：仅更新位置对角线
    this.P[0] += this.Q[0];
    this.P[5] += this.Q[5];
  }

  // 马氏距离门控 — 用于数据关联
  gatingDistance(measurement) {
    const dx = measurement.x - this.state[0];
    const dy = measurement.y - this.state[1];
    // 简化为欧几里得距离的平方
    return dx * dx + dy * dy;
  }

  markMatched() {
    this.hitCount += 1;
    this.missCount = 0;
    if (this.hitCount >= 3) {
      this.confirmed = true;
    }
  }

  markMissed() {
    this.missCount += 1;
    // 连续 5 帧未关联就删除
    if (this.missCount > 5) {
      this.deleted = true;
    }
  }
}

class MultiObjectTracker {
  constructor(config) {
    this.tracks = [];
    this.nextId = 1;
    this.gatingThreshold = config.gatingThreshold || 100.0;  // 固定门控阈值
    this.maxAge = config.maxAge || 5;
    this.minHits = config.minHits || 3;
  }

  // 主循环：每帧调用
  update(frameDetections, timestamp) {
    // 第一步：对所有航迹进行预测
    for (let i = 0; i < this.tracks.length; i++) {
      this.tracks[i].predict();
    }

    // 第二步：匈牙利算法进行数据关联（此处用贪心简化）
    const assignments = this.greedyAssociation(frameDetections);

    // 第三步：更新已关联的航迹
    const assignedTrackIds = [];
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      this.tracks[a.trackIdx].update(frameDetections[a.detIdx]);
      this.tracks[a.trackIdx].markMatched();
      assignedTrackIds.push(a.trackIdx);
    }

    // 第四步：标记未关联的航迹
    for (let i = 0; i < this.tracks.length; i++) {
      if (!assignedTrackIds.includes(i)) {
        this.tracks[i].markMissed();
      }
    }

    // 第五步：未关联的检测量创建新航迹
    const assignedDetIds = assignments.map(a => a.detIdx);
    for (let i = 0; i < frameDetections.length; i++) {
      if (!assignedDetIds.includes(i)) {
        const newTrack = new KalmanTracker(this.nextId++, frameDetections[i]);
        this.tracks.push(newTrack);
      }
    }

    // 第六步：清理已删除的航迹
    this.tracks = this.tracks.filter(t => !t.deleted);
  }

  greedyAssociation(detections) {
    const assignments = [];
    // 计算所有 track-detection 对的距离
    for (let i = 0; i < this.tracks.length; i++) {
      if (this.tracks[i].deleted) continue;
      let bestDet = -1;
      let bestDist = Infinity;
      for (let j = 0; j < detections.length; j++) {
        const dist = this.tracks[i].gatingDistance(detections[j]);
        if (dist < this.gatingThreshold && dist < bestDist) {
          bestDist = dist;
          bestDet = j;
        }
      }
      if (bestDet >= 0) {
        assignments.push({ trackIdx: i, detIdx: bestDet });
      }
    }
    return assignments;
  }

  getConfirmedTracks() {
    return this.tracks.filter(t => t.confirmed && !t.deleted);
  }
}

module.exports = { KalmanTracker, MultiObjectTracker };
