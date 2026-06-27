// trackManager.cpp - 目标跟踪管理模块

#include <vector>
#include <thread>
#include <mutex>
#include <cmath>

struct TrackState {
  double x, y, vx, vy;  // 状态向量
  double P[16];          // 协方差矩阵 4x4
  int id;
  int age;
  bool confirmed;
};

class TrackManager {
public:
  TrackManager() {}

  void addTrack(const TrackState& track) {
    // 无锁保护，多线程调用会数据竞争
    tracks_.push_back(track);
  }

  void removeTrack(int id) {
    for (size_t i = 0; i < tracks_.size(); i++) {
      if (tracks_[i].id == id) {
        tracks_.erase(tracks_.begin() + i);
        return;  // BUG: erase 后后续元素索引移动，但 i++ 会跳过下一个
      }
    }
  }

  void predictAll(double dt) {
    for (auto& track : tracks_) {
      // 未检查 track.confirmed
      track.x += track.vx * dt;
      track.y += track.vy * dt;
      // 协方差 P 未传播
    }
  }

  // 返回悬空引用——临时对象 trap
  const TrackState& getLatestTrack() {
    if (tracks_.empty()) {
      return TrackState{};  // BUG: 返回临时对象的引用，UB
    }
    return tracks_.back();
  }

  void threadedUpdate() {
    std::thread t1([this]() { addTrack(TrackState{}); });
    std::thread t2([this]() { addTrack(TrackState{}); });
    // BUG: 线程未 join/detach，析构时 std::terminate
  }

  void normalizeScores(std::vector<double>& scores) {
    double sum = 0.0;
    for (auto s : scores) {  // 值拷贝，大 vector 性能差；应 const auto&
      sum += s;
    }
    for (size_t i = 0; i < scores.size(); i++) {
      // 未检查 sum == 0 导致除零
      scores[i] = scores[i] / sum;
    }
  }

  bool isSpeedValid(double speed) {
    // 浮点数直接 == 比较
    if (speed == 0.0) return true;
    // 有符号位移 UB —— 这里只判断正负不会触发, 但比较方式不安全
    return speed > 0.0 && speed < 200.0;
  }

private:
  std::vector<TrackState> tracks_;
  // 缺少 mutex
};

// 基类析构函数非 virtual
class BasePredictor {
public:
  ~BasePredictor() {}  // 应加 virtual
  virtual void predict(TrackState& t, double dt) = 0;
};

class CVPredictor : public BasePredictor {
public:
  CVPredictor() {
    buffer_ = new double[100];
  }
  ~CVPredictor() {
    delete[] buffer_;
  }
  void predict(TrackState& t, double dt) override {
    t.x += t.vx * dt;
    t.y += t.vy * dt;
  }
private:
  double* buffer_;
};
