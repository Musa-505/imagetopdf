import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import './App.css'

// Kazakh translations
const translations = {
  title: 'Суреттерді PDF-ке түрлендіру',
  subtitle: 'Суреттерді жүктеп, оларды бір PDF файлына түрлендіріңіз',
  chooseImages: 'Суреттерді таңдау',
  selectedImages: 'Таңдалған суреттер',
  clearAll: 'Барлығын тазалау',
  removeImage: 'Суретті жою',
  converting: 'Түрлендіру...',
  convertToPDF: 'PDF-ке түрлендіру',
  savedPDFs: 'Сақталған PDF файлдары',
  clearHistory: 'Тарихты тазалау',
  download: 'Жүктеп алу',
  shareWhatsApp: 'WhatsApp арқылы бөлісу',
  image: 'сурет',
  images: 'суреттер',
  uploadError: 'Кем дегенде бір сурет жүктеңіз',
  pdfCreated: 'PDF сәтті жасалды және сақталды!',
  pdfError: 'PDF-ке түрлендіру кезінде қате орын алды. Қайталап көріңіз.',
  pdfNotFound: 'PDF қоймада табылмады',
  retrieveError: 'PDF-ті алу кезінде қате',
  storageError: 'Қоймаға қол жеткізу кезінде қате',
  downloadError: 'PDF-ті жүктеп алу кезінде қате',
  clearConfirm: 'Сақталған PDF тарихын тазалағыңыз келетініне сенімдісіз бе?'
}

function App() {
  const [images, setImages] = useState([])
  const [isConverting, setIsConverting] = useState(false)
  const [savedPDFs, setSavedPDFs] = useState([])

  // Load saved PDFs from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('savedPDFs')
    if (stored) {
      try {
        setSavedPDFs(JSON.parse(stored))
      } catch (e) {
        console.error('Error loading saved PDFs:', e)
      }
    }
  }, [])

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImages(prev => [...prev, {
          id: Date.now() + Math.random(),
          file: file,
          url: e.target.result,
          name: file.name
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }

  const convertToPDF = async () => {
    if (images.length === 0) {
      alert(translations.uploadError)
      return
    }

    setIsConverting(true)

    try {
      const pdf = new jsPDF()
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < images.length; i++) {
        if (i > 0) {
          pdf.addPage()
        }

        const img = new Image()
        img.src = images[i].url

        await new Promise((resolve) => {
          img.onload = () => {
            const imgWidth = img.width
            const imgHeight = img.height
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
            const width = imgWidth * ratio
            const height = imgHeight * ratio
            const x = (pdfWidth - width) / 2
            const y = (pdfHeight - height) / 2

            pdf.addImage(img, 'JPEG', x, y, width, height)
            resolve()
          }
        })
      }

      // Generate PDF blob
      const pdfBlob = pdf.output('blob')
      const timestamp = new Date().getTime()
      const fileName = `pdfs/images_${timestamp}.pdf`
      
      // Save PDF blob to IndexedDB
      await savePDFToStorage(pdfBlob, timestamp, images.length)
      
      // Try to use File System Access API for better folder organization
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: `images_${timestamp}.pdf`,
            types: [{
              description: 'PDF files',
              accept: { 'application/pdf': ['.pdf'] }
            }]
          })
          
          const writable = await fileHandle.createWritable()
          await writable.write(pdfBlob)
          await writable.close()
          
          alert(translations.pdfCreated)
        } catch (err) {
          if (err.name !== 'AbortError') {
            // Fallback to regular download
            pdf.save(fileName)
            alert(translations.pdfCreated)
          }
        }
      } else {
        // Fallback for browsers without File System Access API
        pdf.save(fileName)
        alert(translations.pdfCreated)
      }
    } catch (error) {
      console.error('Error converting to PDF:', error)
      alert(translations.pdfError)
    } finally {
      setIsConverting(false)
    }
  }

  const savePDFToStorage = async (pdfBlob, timestamp, imageCount) => {
    // Save blob to IndexedDB
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PDFStorage', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['pdfs'], 'readwrite')
        const store = transaction.objectStore('pdfs')
        
        store.put({
          id: timestamp,
          blob: pdfBlob,
          name: `images_${timestamp}.pdf`,
          date: new Date().toISOString(),
          imageCount: imageCount
        })
        
        transaction.oncomplete = () => {
          // Update state
          const pdfData = {
            id: timestamp,
            name: `images_${timestamp}.pdf`,
            date: new Date().toISOString(),
            imageCount: imageCount
          }
          const updatedPDFs = [...savedPDFs, pdfData]
          setSavedPDFs(updatedPDFs)
          localStorage.setItem('savedPDFs', JSON.stringify(updatedPDFs))
          resolve()
        }
        transaction.onerror = () => reject(transaction.error)
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('pdfs')) {
          db.createObjectStore('pdfs', { keyPath: 'id' })
        }
      }
    })
  }

  const clearAll = () => {
    setImages([])
  }

  const clearSavedPDFs = () => {
    if (window.confirm(translations.clearConfirm)) {
      const request = indexedDB.open('PDFStorage', 1)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['pdfs'], 'readwrite')
        const store = transaction.objectStore('pdfs')
        store.clear()
        transaction.oncomplete = () => {
          setSavedPDFs([])
          localStorage.removeItem('savedPDFs')
        }
      }
    }
  }

  const downloadPDF = async (pdfId, pdfName) => {
    try {
      // Retrieve PDF blob from IndexedDB
      const request = indexedDB.open('PDFStorage', 1)
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('pdfs')) {
          db.createObjectStore('pdfs', { keyPath: 'id' })
        }
      }
      
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['pdfs'], 'readonly')
        const store = transaction.objectStore('pdfs')
        const getRequest = store.get(pdfId)
        
        getRequest.onsuccess = () => {
          const pdfData = getRequest.result
          if (pdfData && pdfData.blob) {
            // Create download link with pdfs folder structure
            const url = URL.createObjectURL(pdfData.blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `pdfs/${pdfName}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
          } else {
            alert(translations.pdfNotFound)
          }
        }
        
        getRequest.onerror = () => {
          alert(translations.retrieveError)
        }
      }
      
      request.onerror = () => {
        alert(translations.storageError)
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert(translations.downloadError)
    }
  }

  return (
    <div className="app">
      <div className="container">
        <h1>{translations.title}</h1>
        <p className="subtitle">{translations.subtitle}</p>

        <div className="upload-section">
          <label htmlFor="image-upload" className="upload-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            {translations.chooseImages}
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>

        {images.length > 0 && (
          <>
            <div className="images-preview">
              <div className="images-header">
                <h2>{translations.selectedImages} ({images.length})</h2>
                <button onClick={clearAll} className="clear-button">
                  {translations.clearAll}
                </button>
              </div>
              <div className="images-grid">
                {images.map((image) => (
                  <div key={image.id} className="image-item">
                    <img src={image.url} alt={image.name} />
                    <button
                      onClick={() => removeImage(image.id)}
                      className="remove-button"
                      title={translations.removeImage}
                    >
                      ×
                    </button>
                    <p className="image-name">{image.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="action-section">
              <button
                onClick={convertToPDF}
                disabled={isConverting}
                className="convert-button"
              >
                {isConverting ? translations.converting : translations.convertToPDF}
              </button>
            </div>
          </>
        )}

        {savedPDFs.length > 0 && (
          <div className="saved-pdfs-section">
            <div className="saved-pdfs-header">
              <h2>{translations.savedPDFs} ({savedPDFs.length})</h2>
              <button onClick={clearSavedPDFs} className="clear-button">
                {translations.clearHistory}
              </button>
            </div>
            <div className="pdfs-list">
              {savedPDFs.slice().reverse().map((pdf) => (
                <div key={pdf.id} className="pdf-item">
                  <div className="pdf-info">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <div className="pdf-details">
                      <p className="pdf-name">{pdf.name}</p>
                      <p className="pdf-meta">
                        {pdf.imageCount} {pdf.imageCount !== 1 ? translations.images : translations.image} • {new Date(pdf.date).toLocaleString('kk-KZ')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadPDF(pdf.id, pdf.name)}
                    className="download-pdf-button"
                    title={translations.download}
                  >
                    {translations.download}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

