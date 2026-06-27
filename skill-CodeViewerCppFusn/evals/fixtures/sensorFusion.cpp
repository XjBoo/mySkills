// sensorFusion.cpp - 多传感器融合模块（C++）

#include <vector>
#include <cstring>
#include <cstdio>

struct SensorData {
  double timestamp;
  double x, y, z;
  double vx, vy;
  char sensor_name[32];
};

class FusionProcessor {
public:
  FusionProcessor() {
    buffer_ = new SensorData[1024];
  }

  ~FusionProcessor() {
    // 注意：此处使用 delete 而非 delete[]
    delete buffer_;
  }

  void processData(SensorData* data, int count) {
    // 不加边界检查，可能溢出
    memcpy(buffer_, data, count * sizeof(SensorData));

    for (int i = 0; i <= count; i++) {
      // 循环越界（<= 应为 <）
      buffer_[i].x *= 2.0;
    }
  }

  SensorData* getBuffer() const { return buffer_; }

  void transformToVehicle(SensorData& data, double* calib_matrix) {
    // 入参未检查 nullptr
    data.x = calib_matrix[0] * data.x + calib_matrix[1] * data.y;
    data.y = calib_matrix[2] * data.x + calib_matrix[3] * data.y;
    // BUG: data.x 在第二行计算时已被第一行修改
  }

  void unsafePrint(int id) {
    char query[128];
    // 格式化字符串注入风险
    sprintf(query, "SELECT * FROM tracks WHERE id = %d", id);
    printf(query);  // 应将 query 作为 "%s" 的参数
  }

  int allocateAndLeak() {
    int* p = new int[100];
    if (p[0] > 0) {
      return 1;  // 提前返回，泄漏 p
    }
    p[0] = 42;
    delete[] p;
    return 0;
  }

private:
  SensorData* buffer_;
  unsigned int counter_;  // 未初始化
};

// 全局变量, 无 static/匿名命名空间保护
double global_threshold = 0.5;

// 单参数构造函数未加 explicit
class TrackId {
public:
  TrackId(int id) : id_(id) {}
  int getId() const { return id_; }
private:
  int id_;
};
