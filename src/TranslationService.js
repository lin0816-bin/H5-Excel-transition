// 模拟翻译服务
// 由于实际翻译API需要密钥，这里提供一个简单的模拟实现

class TranslationService {
  constructor() {
    // 简单的模拟翻译字典
    this.translationDictionary = {
      'hello': '你好',
      'world': '世界',
      'welcome': '欢迎',
      'excel': '表格',
      'translate': '翻译',
      'file': '文件',
      'upload': '上传',
      'download': '下载',
      'success': '成功',
      'error': '错误',
      'processing': '处理中',
      'english': '英语',
      'chinese': '中文',
      'french': '法语',
      'spanish': '西班牙语',
      'german': '德语',
      'japanese': '日语',
      'korean': '韩语',
      'russian': '俄语',
      'italian': '意大利语',
      'portuguese': '葡萄牙语'
    };
  }

  // 模拟翻译函数
  async translate(text, targetLanguage = 'chinese') {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 如果文本是数组，则递归翻译每个元素
    if (Array.isArray(text)) {
      return text.map(item => this.simulateTranslation(item, targetLanguage));
    }
    
    // 单个文本翻译
    return this.simulateTranslation(text, targetLanguage);
  }

  // 模拟翻译逻辑
  simulateTranslation(text, targetLanguage) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    // 转换为小写进行匹配
    const lowerText = text.toLowerCase();
    
    // 检查是否有完全匹配的词
    if (this.translationDictionary[lowerText]) {
      return this.translationDictionary[lowerText];
    }

    // 简单的替换逻辑，尝试替换文本中的单词
    const words = lowerText.split(/\s+/);
    const translatedWords = words.map(word => 
      this.translationDictionary[word] || word
    );
    
    // 恢复原始文本的大小写格式
    return this.restoreCase(text, translatedWords.join(' '));
  }

  // 恢复原始文本的大小写格式
  restoreCase(originalText, translatedText) {
    // 简单实现：如果原始文本全部大写，则翻译后也全部大写
    if (originalText === originalText.toUpperCase()) {
      return translatedText.toUpperCase();
    }
    // 如果原始文本首字母大写，则翻译后也首字母大写
    else if (originalText.charAt(0) === originalText.charAt(0).toUpperCase()) {
      return translatedText.charAt(0).toUpperCase() + translatedText.slice(1);
    }
    // 其他情况保持翻译后的大小写
    return translatedText;
  }

  // 获取支持的语言列表
  getSupportedLanguages() {
    return [
      { code: 'english', name: 'English' },
      { code: 'chinese', name: '中文' },
      { code: 'french', name: 'Français' },
      { code: 'spanish', name: 'Español' },
      { code: 'german', name: 'Deutsch' },
      { code: 'japanese', name: '日本語' },
      { code: 'korean', name: '한국어' },
      { code: 'russian', name: 'Русский' },
      { code: 'italian', name: 'Italiano' },
      { code: 'portuguese', name: 'Português' }
    ];
  }
}

export default new TranslationService();