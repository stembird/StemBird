const fs=require('fs'); fs.writeFileSync('src/data/templateDefaultContent.ts','test',{encoding:'utf8'}); console.log('ok',fs.statSync('src/data/templateDefaultContent.ts').size);
