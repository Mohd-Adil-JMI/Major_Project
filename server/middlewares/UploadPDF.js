import multer from 'multer';

const pdfFilter = (req, file, cb) => {
    if (file.mimetype.includes("pdf")) {
        cb(null, true);
    } else {
        cb("Please upload only pdf file.", false);
    }
}

var storage = multer.diskStorage({ // multer storage
    destination: (req, file, cb) => {
        cb(null, __basedir + "/rag_documents/"); // upload file to server/rag_documents
    },
});

const uploadPDF = multer({ storage: storage, fileFilter: pdfFilter });
