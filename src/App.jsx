import { useState, useRef } from 'react'
import './App.css'
import ExcelService from './ExcelService'
import TranslationService from './TranslationService'

function App() {
  // 状态管理
  const [selectedFile, setSelectedFile] = useState(null)
  const [supportedLanguages, setSupportedLanguages] = useState([])
  const [sourceLanguage, setSourceLanguage] = useState('english')
  const [targetLanguage, setTargetLanguage] = useState('chinese')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processProgress, setProcessProgress] = useState(0)
  const [excelData, setExcelData] = useState(null)
  const [translatedData, setTranslatedData] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [translationComplete, setTranslationComplete] = useState(false)
  const [copySuccess, setCopySuccess] = useState('')
  
  // 文件输入引用
  const fileInputRef = useRef(null)

  // 初始化加载支持的语言
  useState(() => {
    try {
      const languages = TranslationService.getSupportedLanguages()
      setSupportedLanguages(languages)
    } catch (error) {
      console.error('加载语言列表失败:', error)
    }
  })

  // 处理文件选择
  const handleFileChange = (event) => {
    const file = event.target.files[0]
    handleFileSelection(file)
  }

  // 处理拖拽事件
  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    
    const file = event.dataTransfer.files[0]
    handleFileSelection(file)
  }

  // 处理文件选择的核心逻辑
  const handleFileSelection = (file) => {
    if (!file) return
    
    // 验证文件是否为有效的Excel文件
    if (!ExcelService.isValidExcelFile(file)) {
      setErrorMessage('请上传有效的Excel文件（.xlsx, .xls, .csv）')
      setSelectedFile(null)
      return
    }
    
    // 验证文件大小
    const fileSize = ExcelService.getFileSizeInMB(file)
    const maxSize = ExcelService.getSupportedFormats().maxSizeMB
    
    if (fileSize > maxSize) {
      setErrorMessage(`文件大小超过限制（${maxSize}MB）`)
      setSelectedFile(null)
      return
    }
    
    // 重置状态并设置选中的文件
    setSelectedFile(file)
    setErrorMessage('')
    setSuccessMessage(`已选择文件: ${file.name} (${fileSize}MB)`)    
  }

  // 开始翻译过程
  const startTranslation = async () => {
    if (!selectedFile) {
      setErrorMessage('请先选择一个Excel文件')
      return
    }
    
    setIsProcessing(true)
    setProcessProgress(0)
    setTranslationComplete(false)
    setErrorMessage('')
    
    try {
      // 1. 读取Excel文件
      setProcessProgress(20)
      const excelResult = await ExcelService.readExcelFile(selectedFile)
      setExcelData(excelResult)
      
      // 2. 准备翻译数据
      setProcessProgress(40)
      const dataToTranslate = { ...excelResult.sheets }
      
      // 3. 执行翻译
      setProcessProgress(60)
      const translatedResult = await translateExcelData(dataToTranslate)
      setTranslatedData(translatedResult)
      
      // 4. 处理翻译结果
      setProcessProgress(100)
      const finalData = await ExcelService.processTranslatedData(
        excelResult.sheets,
        translatedResult,
        targetLanguage
      )
      
      // 5. 创建并下载翻译后的文件
      setProcessProgress(100)
      const newFileName = `${selectedFile.name.replace(/\.[^/.]+$/, '')}_translated_${targetLanguage}.xlsx`
      
      // 保存文件数据，但不自动下载
      setSuccessMessage(`翻译完成！`)  
      setTranslationComplete(true)
    } catch (error) {
      console.error('翻译过程失败:', error)
      setErrorMessage(`翻译失败: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // 翻译Excel数据的核心逻辑
  const translateExcelData = async (excelData) => {
    const result = {};
    
    // 遍历每个工作表
    for (const [sheetName, sheetData] of Object.entries(excelData)) {
      result[sheetName] = [];
      
      // 遍历每一行
      for (const row of sheetData) {
        const translatedRow = { ...row };
        
        // 遍历每个单元格
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'string' && value.trim()) {
            try {
              // 翻译单元格内容
              const translatedValue = await TranslationService.translate(value, targetLanguage)
              translatedRow[key] = translatedValue
            } catch (error) {
              console.warn(`翻译单元格 [${sheetName}][${key}] 失败:`, error)
              // 保留原始值
              translatedRow[key] = value
            }
          }
        }
        
        result[sheetName].push(translatedRow);
      }
    }
    
    return result;
  }

  // 复制到剪贴板的函数
  const copyToClipboard = (text, e = null) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess('已复制！');
      setTimeout(() => setCopySuccess(''), 2000);
    }).catch(err => {
      console.error('复制失败:', err);
    });
  }

  // 获取语言的显示名称
  const getLanguageDisplayName = (languageKey) => {
    // 语言代码到显示名称的映射
    const languageMap = {
      '_EMPTY': '语言 1', 
      '_EMPTY_1': '语言 2',
      '_EMPTY_2': '语言 3',
      '_EMPTY_3': '语言 4',
      '_EMPTY_4': '语言 5'
    };
    
    return languageMap[languageKey] || languageKey;
  }
  
  // 渲染翻译结果模块
  const renderTranslatedModules = () => {
    if (!translatedData) return null;
    
    // 从translatedData中提取语言信息
    // 假设每个工作表的列代表不同的语言
    const languageGroups = {};
    
    // 遍历每个工作表和行
    Object.entries(translatedData).forEach(([sheetName, sheetData]) => {
      sheetData.forEach((row, rowIndex) => {
        // 遍历行中的每个键值对
        Object.entries(row).forEach(([key, value]) => {
          // 将键作为语言标识符
          if (!languageGroups[key]) {
            languageGroups[key] = [];
          }
          
          // 为每种语言添加翻译结果
          languageGroups[key].push(`"${rowIndex+1}": "${value}"`);
        });
      });
    });
    
    // 为每种语言创建一个模块
    const modules = [];
    Object.entries(languageGroups).forEach(([languageKey, translations]) => {
      const commaSeparatedString = translations.join(',\n');
      const moduleId = `language_${languageKey}`;
      
      // 创建更友好的语言显示名称
      const languageDisplayName = getLanguageDisplayName(languageKey);
      
      modules.push(
        <div key={moduleId} className="module-container p-4 bg-white rounded-lg shadow mb-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-sm text-gray-600">{languageDisplayName}</h4>
            <button
              onClick={() => copyToClipboard(commaSeparatedString)}
              className="text-gray-500 hover:text-blue-600 focus:outline-none"
              title="复制此模块"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <pre className="bg-gray-50 p-3 rounded-md text-sm overflow-x-auto">{commaSeparatedString}</pre>
        </div>
      );
    });
    
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">翻译结果（按语言分组）</h3>
        <div className="flex flex-wrap gap-4">
          {modules}
        </div>
      </div>
    );
  }

  // 预览Excel数据
  const previewExcelData = () => {
    if (!excelData) return null;
    
    // return (
    //   <div className="mt-4 p-4 bg-white rounded-lg shadow">
    //     <h3 className="text-lg font-semibold mb-2">文件内容预览</h3>
    //     <div className="overflow-x-auto">
    //       {Object.entries(excelData.sheets).map(([sheetName, sheetData]) => (
    //         <div key={sheetName} className="mb-4">
    //           <h4 className="font-medium mb-2">工作表: {sheetName}</h4>
    //           <table className="min-w-full border border-gray-200">
    //             <thead>
    //               <tr className="bg-gray-50">
    //                 {Object.keys(sheetData[0] || {}).map((header) => (
    //                   <th key={header} className="px-2 py-1 border border-gray-200 text-xs">{header}</th>
    //                 ))}
    //               </tr>
    //             </thead>
    //             <tbody>
    //               {sheetData.map((row, rowIndex) => (
    //                 <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
    //                   {Object.values(row).map((cell, cellIndex) => (
    //                     <td key={cellIndex} className="px-2 py-1 border border-gray-200 text-xs">
    //                       {cell}
    //                     </td>
    //                   ))}
    //                 </tr>
    //               ))}
    //             </tbody>
    //           </table>
    //         </div>
    //       ))}
    //     </div>
    //   </div>
    // );
  }

  // 渲染进度条
  const renderProgressBar = () => {
    if (!isProcessing) return null;
    
    return (
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${processProgress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-1">处理进度: {processProgress}%</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center">Excel 翻译工具</h1>
          <p className="text-gray-600 text-center mt-1">上传Excel文件，选择目标语言，一键翻译内容</p>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 flex-grow max-w-4xl">
        {/* 文件上传区域 */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
          />
          
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          
          <h2 className="mt-4 text-lg font-medium text-gray-700">拖放Excel文件到此处或点击上传</h2>
          <p className="mt-2 text-sm text-gray-500">支持 .xlsx, .xls, .csv 格式，最大 {ExcelService.getSupportedFormats().maxSizeMB}MB</p>
          
          {selectedFile && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md inline-block">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-800">{selectedFile.name}</span>
              </div>
            </div>
          )}
        </div>



        {/* 操作按钮 */}
        {selectedFile && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={startTranslation}
              disabled={isProcessing}
              className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>翻译中...</span>
                </div>
              ) : (
                <span>开始翻译</span>
              )}
            </button>
          </div>
        )}

        {/* 进度条 */}
        {renderProgressBar()}

        {/* 消息显示 */}
        {(errorMessage || successMessage) && (
          <div className={`mt-4 p-3 rounded-md ${errorMessage ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            <div className="flex items-start">
              <svg className="flex-shrink-0 mt-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="ml-2 text-sm">{errorMessage || successMessage}</p>
              <button
                onClick={() => {
                  setErrorMessage('')
                  setSuccessMessage('')
                }}
                className="ml-auto text-gray-400 hover:text-gray-500"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Excel数据预览 */}
        {excelData && !isProcessing && previewExcelData()}

        {/* 翻译完成后的操作 */}
        {translationComplete && (
          <>
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-800">翻译成功完成！</h3>
              </div>
              <p className="mt-2 text-gray-600">您可以查看下方的翻译结果。</p>
              <div className="mt-4 flex space-x-4">
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setExcelData(null)
                    setTranslatedData(null)
                    setTranslationComplete(false)
                    setSuccessMessage('')
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  上传新文件
                </button>
              </div>
            </div>
            
            {/* 显示复制成功的提示 */}
            {copySuccess && (
              <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {copySuccess}
              </div>
            )}
            
            {/* 渲染翻译结果模块 */}
            {renderTranslatedModules()}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>Excel 翻译工具 &copy; {new Date().getFullYear()} | 保护您的数据隐私</p>
          <p className="mt-1">注意：此工具仅在您的浏览器中处理文件，不会上传到服务器</p>
        </div>
      </footer>
    </div>
  )
}

export default App
