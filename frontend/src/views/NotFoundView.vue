<template>
  <div class="not-found">
    <div class="content">
      <h1>404</h1>
      <p>页面不存在</p>
      <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 404 page
</script>

<style scoped>
.not-found {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f2f5;
}

.content {
  text-align: center;
}

h1 {
  font-size: 120px;
  margin: 0;
  color: #909399;
}

p {
  font-size: 20px;
  color: #606266;
  margin: 10px 0 30px;
}
</style>