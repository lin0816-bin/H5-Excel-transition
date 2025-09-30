import * as XLSX from 'xlsx';

class ExcelService {
  constructor() {
    // 初始化配置
    this.config = {
      raw: false, // 是否返回原始数据
      cellDates: true // 是否解析日期类型
    };
  }

  // 从文件读取Excel数据
  async readExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // 读取文件数据
          const data = new Uint8Array(e.target.result);
          // 解析Excel文件
          const workbook = XLSX.read(data, this.config);
          
          // 提取所有工作表的数据
          const result = {};
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            // 将工作表数据转换为JSON格式
            result[sheetName] = XLSX.utils.sheet_to_json(worksheet);
          });
          
          resolve({
            sheets: result,
            sheetNames: workbook.SheetNames
          });
        } catch (error) {
          reject(new Error('读取Excel文件失败：' + error.message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取错误'));
      };
      
      // 以二进制方式读取文件
      reader.readAsArrayBuffer(file);
    });
  }

  // 创建Excel文件并下载
  createExcelFile(data, fileName = 'translated-excel.xlsx') {
    try {
      // 创建新的工作簿
      const workbook = XLSX.utils.book_new();
      
      // 为每个工作表添加数据
      Object.keys(data).forEach(sheetName => {
        const sheetData = data[sheetName];
        // 创建工作表
        const worksheet = XLSX.utils.json_to_sheet(sheetData);
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });
      
      // 生成Excel文件并下载
      XLSX.writeFile(workbook, fileName);
      return true;
    } catch (error) {
      console.error('创建Excel文件失败：', error);
      return false;
    }
  }

  // 处理翻译后的Excel数据
  async processTranslatedData(originalData, translatedData, targetLanguage) {
    try {
      const result = {};
      
      // 遍历每个工作表
      Object.keys(originalData).forEach(sheetName => {
        const originalSheet = originalData[sheetName];
        const translatedSheet = translatedData[sheetName];
        
        if (!originalSheet || !translatedSheet) return;
        
        // 创建新的工作表数据，包含原始和翻译后的内容
        result[sheetName] = originalSheet.map((row, rowIndex) => {
          const translatedRow = translatedSheet[rowIndex] || {};
          const newRow = { ...row };
          
          // 为每个单元格添加翻译后的内容
          Object.keys(row).forEach(key => {
            if (translatedRow[key]) {
              // 在原始列名后添加语言代码作为翻译列名
              newRow[`${key}_${targetLanguage}`] = translatedRow[key];
            }
          });
          
          return newRow;
        });
      });
      
      return result;
    } catch (error) {
      console.error('处理翻译数据失败：', error);
      throw error;
    }
  }

  // 验证文件是否为有效的Excel文件
  isValidExcelFile(file) {
    const validExtensions = ['xlsx', 'xls', 'csv'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return validExtensions.includes(fileExtension);
  }

  // 获取文件大小（MB）
  getFileSizeInMB(file) {
    return (file.size / (1024 * 1024)).toFixed(2);
  }

  // 支持的文件格式信息
  getSupportedFormats() {
    return {
      extensions: ['xlsx', 'xls', 'csv'],
      maxSizeMB: 10
    };
  }
}

export default new ExcelService();