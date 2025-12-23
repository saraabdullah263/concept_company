import { getCachedLogoBase64 } from '../utils/logoBase64';

// توليد عقد PDF جديد بنص العقد الأصلي
export const generateNewContractPDF = async (contractData) => {
    const {
        contractDate,
        clientName,
        clientActivity,
        clientAddress,
        commercialRegister,
        taxNumber,
        pricePerKg,
        contractFees,
        contractDuration,
        phoneNumbers,
        managerName,
        contractNumber,
        startDate,
        endDate,
        minWeight = '15',
        minPrice = '',
    } = contractData;

    // Get the logo as base64
    const logoUrl = await getCachedLogoBase64() || `${window.location.origin}/logo.png`;

    const contractHTML = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <title>عقد رقم ${contractNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            @page { 
                size: A4; 
                margin: 1.2cm 1.5cm;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Cairo', 'Traditional Arabic', 'Arial', sans-serif;
                direction: rtl;
                text-align: justify;
                line-height: 1.8;
                padding: 15px 25px;
                background: white;
                color: #1a1a1a;
                font-size: 12.5px;
            }
            /* Header Styles */
            .header {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 12px;
                border-bottom: 3px double #0d4f8b;
                position: relative;
            }
            .header::after {
                content: '';
                position: absolute;
                bottom: 4px;
                left: 20%;
                right: 20%;
                height: 1px;
                background: #0d4f8b;
            }
            .header-logo {
                width: 150px;
                height: auto;
            }
            .header-text {
                flex: 1;
                text-align: center;
            }
            .company-name {
                font-size: 24px;
                font-weight: 700;
                color: #0d4f8b;
                margin-bottom: 3px;
                letter-spacing: 1px;
            }
            .company-desc {
                font-size: 13px;
                color: #444;
                margin-bottom: 2px;
                font-weight: 600;
            }
            
            /* Contract Title */
            .contract-title {
                font-size: 20px;
                font-weight: 700;
                text-align: center;
                margin: 18px 0 8px;
                color: #0d4f8b;
                padding: 8px 20px;
                background: linear-gradient(90deg, transparent, #f0f7ff, transparent);
                border-radius: 5px;
            }
            .contract-subtitle {
                font-size: 15px;
                text-align: center;
                margin-bottom: 18px;
                font-weight: 600;
                color: #333;
            }
            
            /* Intro */
            .intro {
                margin-bottom: 15px;
                text-indent: 25px;
                background: #fafafa;
                padding: 10px 15px;
                border-radius: 5px;
                border-right: 4px solid #0d4f8b;
            }
            
            /* Party Sections */
            .party-section {
                background: #f8fafc;
                border-radius: 8px;
                padding: 12px 15px;
                margin-bottom: 12px;
                border: 1px solid #e2e8f0;
            }
            .party-title {
                font-weight: 700;
                font-size: 14px;
                color: #0d4f8b;
                margin-bottom: 10px;
                padding-bottom: 5px;
                border-bottom: 2px solid #0d4f8b;
                display: inline-block;
            }
            .party-info p {
                margin: 6px 0;
                padding-right: 10px;
            }
            .party-info strong {
                color: #333;
            }
            
            /* Field Values */
            .field-value {
                color: #0d4f8b;
                font-weight: 700;
                background: #fff;
                padding: 2px 12px;
                border-radius: 3px;
                border-bottom: 2px dotted #0d4f8b;
                display: inline-block;
                min-width: 120px;
            }
            .field-value-inline {
                color: #0d4f8b;
                font-weight: 700;
                border-bottom: 1px dotted #666;
                padding: 0 8px;
            }
            
            /* Section Styles */
            .section-title {
                font-weight: 700;
                font-size: 14px;
                color: #0d4f8b;
                margin: 18px 0 10px;
                padding: 6px 12px;
                background: linear-gradient(90deg, #0d4f8b, #1a6fc4);
                color: white;
                border-radius: 4px;
                display: inline-block;
            }
            .section-content {
                margin-bottom: 10px;
                text-align: justify;
                text-indent: 25px;
                padding: 5px 10px;
            }
            
            /* Band Titles */
            .band-title {
                font-weight: 700;
                font-size: 13px;
                margin: 14px 0 6px;
                color: #0d4f8b;
                padding: 5px 10px;
                background: #e8f4fc;
                border-radius: 4px;
                border-right: 4px solid #0d4f8b;
            }
            .band-title-sub {
                font-size: 11px;
                color: #666;
                font-weight: 400;
            }
            
            /* Agreement Text */
            .agreement-text {
                text-align: center;
                margin: 15px 0;
                padding: 10px;
                background: #f0f7ff;
                border-radius: 5px;
                font-weight: 600;
                color: #333;
            }
            
            /* Important Note */
            .important-note {
                background: #fff8e6;
                border: 1px solid #ffd700;
                border-radius: 5px;
                padding: 8px 12px;
                margin: 8px 0;
                font-weight: 600;
            }
            
            /* Signatures */
            .signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 30px;
                page-break-inside: avoid;
            }
            .signature-box {
                width: 46%;
                text-align: center;
                border: 2px solid #0d4f8b;
                border-radius: 10px;
                padding: 15px;
                background: #fafcff;
            }
            .signature-box h4 {
                font-weight: 700;
                font-size: 13px;
                margin-bottom: 8px;
                color: #0d4f8b;
                padding-bottom: 8px;
                border-bottom: 2px solid #0d4f8b;
            }
            .signature-box p {
                margin: 4px 0;
                font-size: 11.5px;
            }
            .signature-line {
                margin-top: 40px;
                border-top: 2px solid #333;
                padding-top: 8px;
                font-weight: 600;
            }
            
            /* Page Break */
            .page-break { page-break-before: always; }
            
            /* Print Styles */
            @media print {
                body { 
                    padding: 0; 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .party-section, .band-title, .section-title, .signature-box {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        </style>
    </head>
    <body>
        <!-- Header -->
        <div class="header">
            <div class="header-text">
                <div class="company-name">Concept Eco Care</div>
                <div class="company-desc">كونسبت للخدمات البيئية</div>
                <div class="company-desc">جمع ونقل النفايات الطبية الخطرة</div>
            </div>
            <img src="${logoUrl}" alt="Concept Eco Care" class="header-logo" />
        </div>

        <!-- Contract Title -->
        <div class="contract-title">عقـــــد تقديم خدمات</div>
        <div class="contract-subtitle">النقل والتخلص الآمن من النفايات الطبية الخطرة</div>

        <!-- Intro -->
        <p class="intro">
            إنه في يوم: <span class="field-value-inline">${contractDate}</span> الموافق: <span class="field-value-inline">${startDate || contractDate}</span> قد تحرر هذا العقد بمدينة القاهرة فيما بين كل من:
        </p>

        <!-- First Party -->
        <div class="party-section">
            <div class="party-title">( الطرف الأول – مُؤدي الخدمة )</div>
            <div class="party-info">
                <p><strong>اسم المنشأة:</strong> شركة كونسبت لتوريد المستلزمات الطبية ومستلزمات غسيل الكلى.</p>
                <p><strong>الكيان القانوني:</strong> (منشأة فردية) - <strong>التخصص / النشاط:</strong> جمع ونقل النفايات الطبية.</p>
                <p><strong>المقر الرئيسي:</strong> 16 شارع الهدايا – من شارع كعبيش – فيصل – محافظة الجيزة</p>
                <p><strong>مقر الفرع:</strong> شقة بالدور الأرضي - خلف شركة الكهرباء – باسوس – مركز القناطر الخيرية – محافظة القليوبية.</p>
                <p><strong>سجل تجاري:</strong> 83308 غرفة الجيزة | <strong>رقم ضريبي:</strong> 738-870-578</p>
                <p><strong>الممثل القانوني:</strong> عبد الرحمن مصطفى طه محمدي عسوس - <strong>الصفة:</strong> مالك ومدير عام المنشأة</p>
                <p><strong>خدمة العملاء:</strong> 01033193280 / 01029610733</p>
            </div>
        </div>

        <!-- Second Party -->
        <div class="party-section">
            <div class="party-title">( الطرف الثاني – العميل )</div>
            <div class="party-info">
                <p><strong>اسم المنشأة:</strong> <span class="field-value">${clientName || '..........................................'}</span> <strong>التخصص/ النشاط:</strong> <span class="field-value">${clientActivity || '........................'}</span></p>
                <p><strong>المقـر:</strong> <span class="field-value">${clientAddress || '....................................................................'}</span></p>
                <p><strong>سجل تجاري:</strong> <span class="field-value">${commercialRegister || '............................'}</span> | <strong>رقم ضريبي:</strong> <span class="field-value">${taxNumber || '............................'}</span></p>
                <p><strong>الممثل القانوني:</strong> <span class="field-value">${managerName || '....................................'}</span> <strong>(المدير المسئول)</strong></p>
                <p><strong>التليفون:</strong> <span class="field-value">${phoneNumbers || '....................................'}</span></p>
            </div>
        </div>

        <div class="agreement-text">وبعد أن أقر الطرفان بأهليتهما القانونية اللازمة للتعاقد فقد اتفقا على ما يلي:</div>

        <!-- تمهيد -->
        <div class="section-title">تـمهيـــد</div>
        <div class="section-content">
            حيث يرغب الطرف الثاني في الاستفادة من خبرات وخدمات الطرف الأول كأحد الشركات المرخص لها قانوناً (من قبل وزارة الصحة والإدارة العامة للشئون البيئة والإدارة العامة للصحة البيئية) بتقديم خدمات النقل والمعالجة والتخلص الآمن من المخلفات والنفايات الطبية الخطرة، وحيث تقدم الطرف الأول بعرضه إلى الطرف الثاني لتولي مهمة تقديم تلك الخدمات وقد أقر بأن لديه من القدرات الفنية التي تؤهله لتقديم تلك الخدمات فضلاً عن امتثاله للقرارات الوزارية والقواعد التنظيمية المقررة قانوناً من وزارة الصحة والسكان لمنظومة التخلص الآمن من المخلفات الطبية الخطرة، ومن ثم قد لاقى هذا العرض القبول من العميل.
        </div>
        <div class="section-content">
            وعليه، فقد تلاقت إرادة الطرفين على إسناد مهمة أداء تلك الخدمات إلى الطرف الأول للتخلص من النفايات الخطرة بمقر العميل بالشكل القانوني والصحي، وفقاً للشروط والأحكام والتعهدات الواردة بها في هذا العقد. وبعد أن أقر الطرفان بتوافر أهليتهما القانونية للتعاقد وخلوها من أية موانع قانونية للتعاقد، فقد اتفقا على ما يلي:
        </div>

        <!-- البنود -->
        <div class="band-title">البند الأول</div>
        <div class="section-content">
            يعتبر التمهيد السابق وكافة المخاطبات والأوراق المتداولة بين الطرفين ومحاضر التسليم الخاصة بتنفيذ معاملات هذا العقد جزء لا يتجزأ من هذا العقد، ومتمماً ومكملاً له ومفسراً لأحكامه.
        </div>

        <div class="band-title">البند الثاني</div>
        <div class="section-content">
            تقر شركة كونسبت بإنها تحمل ترخيص تداول النفايات الطبية الخطرة من قبل وزارة الصحة والإدارة العامة للشئون البيئة والإدارة العامة للصحة البيئية، وتكون الشركة مسئولة عن استمرار سريان وصلاحية هذه التراخيص طوال مدة العقد.
        </div>

        <div class="band-title">البند الثالث</div>
        <div class="section-content">
            بموجب هذا العقد اسند الطرف الثاني إلى الطرف الأول (مهام النقل الدوري الآمن للنفايات الطبية الخطرة والتخلص منها) من مقر العميل الى إدارة المحرقة المتعاقد معها الطرف الأول، على أن يكون تنفيذ الخدمات طبقاً للقوانين المعمول بها في جمهورية مصر العربية واشتراطات وزارة الصحة والسكان ووزارة البيئة، وبسيارات مجهزة ومرخصة قانوناً من قبل وزارة الصحة والسكان والإدارة العامة لصحة البيئة، وبواسطة العمالة الفنية ذات الكفاءة والمؤهلة والمدربة على التعامل مع النفايات الطبية الخطرة. ويتحمل الطرف الأول بمفرده توفير وسائل الوقاية ووسائل الأمن والسلامة والصحة المهنية للعمال التابعين له وظيفياً وذلك دون أدنى مسئولية على المستشفى.
        </div>

        <div class="band-title">البند الرابع</div>
        <div class="section-content">
            يلتزم الطرف الثاني بتسليم الطرف الأول كمية النفايات وذلك تجميعها في أكياس حمراء محكمة الغلق وغير مسربة للمياه أو الدماء وأن تكون الاكياس الحمراء قوية حتى لا تتعرض للتسرب أو تمزق الكيس بأي شكل من الأشكال وعلي أن تكون السنون والمشارط بداخل الحاويات الكرتونية الخاصة بها وأن تكون محكمة الغلق وبداخل أكياس حمراء قوية محكمة الغلق حتى يتمكن المندوب من تحميلها بشكل آمن وسليم في السيارة وتوصيلها إلى المحرقة بشرط أن لا يوجد في الأكياس أي نفايات من شأنها إحداث أي خطورة فنية أو انفجارات أو اشتعال أو نفايات تشتمل علي أعضاء بشرية أو ما شابه ذلك وأي نفايات غير مطابقة للمواصفات المتعارف عليها للنفايات الطبية الخطرة.
        </div>
        <div class="section-content">
            يلتزم الطرف الأول بوزن جميع المخلفات المستلمة من العميل بموازين معتمدة يتم توفيرها بمعرفة الطرف الأول، وتوثيق واثبات الوزن بإيصال الاستلام وموافاة العميل بصورة منه والتوقيع من الطرفين بسجل التسليم والتسلم للمخلفات الخاص بالمستشفى.
        </div>

        <div class="band-title">البند الخامس <span class="band-title-sub">(مدة العقد)</span></div>
        <div class="section-content">
            اتفق الطرفان على أن مدة هذا العقد <span class="field-value-inline">${contractDuration || 'سنة ميلادية واحدة'}</span> تبدأ من: <span class="field-value-inline">${startDate || '    /     /2025م'}</span> وتنتهي في: <span class="field-value-inline">${endDate || '    /     /2026م'}</span>.
        </div>

        <div class="band-title">البند السادس <span class="band-title-sub">(الأسعار والسداد)</span></div>
        <div class="section-content">
            اتفق الطرفان على أن سعر نقل وحرق النفايات الطبية الخطرة بمبلغ وقدره: (<span class="field-value-inline">${pricePerKg || '......'}</span>) جنيه مصري لكل كيلو نفايات طبية، واتفق الطرفان أن رسوم التعاقد السنوية بمبلغ قدره: (<span class="field-value-inline">${contractFees || '......'}</span>) جنية، وأن الحد الأدنى لوزن النقلة (${minWeight} كجم) في كل مره، وإن لم يتواجد الوزن المطلوب يتم احتساب الحد الأدنى لسعر النقلة (<span class="field-value-inline">${minPrice || '......'}</span>) جنية.
        </div>
        <div class="important-note">
            ⚠️ السعر المذكور غير شامل ضريبة القيمة المضافة
        </div>
        <div class="section-content">
            يتم سداد مستحقات الطرف الأول (طبقاً للأوزان الفعلية التي تم رفعها) خلال 15 يوم من تاريخ تسليم المطالبة الشهرية إلى العميل.
        </div>

        <div class="band-title">البند السابع</div>
        <div class="section-content">
            تلتزم شركة كونسبت بنقل النفايات الطبية الخطرة من مخازن الطرف الثاني بعد (التنسيق والاتصال مع العميل) بمده لا تقل عن اسبوع وذلك بصفة دورية ومنتظمة ما عدا أيام الجمعة والاعياد والعطلات الرسمية.
        </div>

        <div class="band-title">البند الثامن</div>
        <div class="section-content">
            يلتزم الطرف الثاني بتحديد شخص معين او شخصين دون غيرهم كممثل لهم في تنفيذ معاملات هذا العقد منعا لسوء التفاهم لمتابعة أعمال تسجيل النفايات بدفاتر الطرف الثاني في موعد التحميل، وعلى الطرف الثاني او مندوبة متابعة تسهيل تحميل النفايات الطبية الخطرة والتوقيع على الإيصالات الدالة علة التسليم والتسلم.
        </div>

        <div class="band-title">البند التاسع</div>
        <div class="section-content">
            اتفق الطرفان أنه في حالة صدور قرارات حكومية رسمية بزيادة أسعار المعالجة والحرق في المحرقة التابعة لمديريه الصحة أو زيادة أسعار الوقود، يتم تعديل الأسعار المتفق عليها بالعقد حسب نسب الزيادة من تاريخه وذلك بشرط قيام الطرف الأول بالإخطار المسبق للعميل وأخذ موافقته على قبول تطبيق نسب الزيادة.
        </div>
        <div class="section-content">
            اتفق الطرفان أنه من حق الطرف الاول إيقاف العمل وعدم نقل النفايات الطبية الخطرة للطرف الثاني في حالة التأخير دون مبرر مشروع في سداد المبالغ المستحقة لشركة كونسبت وذلك بدون أدنى مسئولية تذكر على الطرف الأول، وذلك بشرط قيام الطرف الأول بإخطار العميل بشكل مسبق على إيقاف العمل بمدة لا تقل عن 15 يوم لقيام العميل بتدارك وحل أسباب ذلك.
        </div>

        <div class="band-title">البند العاشر</div>
        <div class="section-content">
            إتفق الطرفان في حالة حدوث أي شكوى من العميل من أداء الخدمات أو من عاملي الطرف الاول، يتم الإبلاغ عنها بوسائل التواصل الرسمية للطرفين الى المسئولين بشركة كونسبت، والشركة مسئوله عن حلها وإزالة أسباب الشكوى بأسرع وقت ممكن. يتلقى الطرف الأول الطلبات والشكاوى من العملاء على مدار الـ 24 ساعة وطوال أيام الأسبوع، من خلال: <strong>01033193280 / 01029610733</strong>
        </div>

        <div class="band-title">البند الحادى عشر <span class="band-title-sub">(إنهاء أو فسخ العقد)</span></div>
        <div class="section-content">
            يجوز لكل من الطرفين طلب إيقاف أو إنهاء أو فسخ هذا العقد قبل انتهاء مدته إذا أخل الطرف الأخر بأحد التزاماته الجوهرية التي يفرضها عليه هذا العقد، على أن يتم الإخطار بذلك بشكل مسبق قبل هذا الانهاء ب (21) يوماً على الأقل بموجب (اخطار كتابي) مسبب مع اعطاء الطرف الأخر مهلة قدرها عشرة أيام من تاريخ الاخطار كمهلة لتدارك أوجه الخلل المتسبب في ذلك الانهاء وإزالة أسبابه، وفي حال انتهاء تلك المهلة دون الرد من الطرف الأخر ودون زوال أو تدارك أسباب هذا الخلل المسبب للإنهاء، اعتبر هذا الإنذار منتجاً لأثاره القانونية كاملة في الميعاد المقرر للنهاء أو الفسخ بما في ذلك انهاء أو فسخ العقد من تلقاء نفسه دون الرجوع الى الطرف الاخر ودون حاجة إلى تنبيه أو إنذار أو صدور حكم قضائي.
        </div>

        <div class="band-title">البند الثانى عشر <span class="band-title-sub">(أحكام عامة)</span></div>
        <div class="section-content">
            هذا العقد يمثل الاتفاق الشامل بين الطرفين ولا يتم الاعتداد بأية تعديلات أو إضافات مُدخلة على هذا العقد إلا إذا كانت باتفاق كتابي مُوقع من الطرفين. هذا العقد يخص طرفيه فقط لا غير، ويُحظر على أي طرف أن يُحيل أو يتنازل للغير عن كل أو بعض الالتزامات أو الحقوق الناشئة بموجب هذا التعاقد إلا بموافقة كتابية صريحة ومسبقة من الطرف الأول بذلك.
        </div>
        <div class="section-content">
            يقر الطرفان بأن لكل منهما كياناً قانونياً مستقل بذاته، ولا يملك أي طرف سلطة التصرف بالنيابة عن الآخر أو التحدث باسمه أو استخدام أسمه التجاري أو علامته التجارية بأي وسيلة كانت، ويلتزم كل من الطرفان منفرداً بتحمل مسئولياته القانونية عن كافة خدماته ومعاملاته وعلاقاته مع الغير.
        </div>
        <div class="section-content">
            يتعهد الطرف الأول بالمحافظة على سرية جميع المعلومات والبيانات والمستندات والأوراق والحسابات الخاصة بتنفيذ معاملات هذا العقد، أو الخاصة بطبيعة أعمال العميل، أو عملياته التشغيلية، أو المعلومات الغير منشورة، أو الخاصة بالمراسلات المتداولة بين الطرفين، ويتعهد الطرفين بعدم إفشائها أو الإفصاح عنها للغير.
        </div>

        <div class="band-title">البند الثالث عشر <span class="band-title-sub">(المُراسلات المُـتبادلة)</span></div>
        <div class="section-content">
            يقر كلا الطرفان بانه اتخذ من عنوانه الموضح بصدر هذا الاتفاق كموطنً مختاراً له وأن جميع المكاتبات والمراسلات والإخطارات والأوراق أو الدعاوى الموجهة له على هذا العنوان تعتبر صحيحة ومنتجة لكافة آثارها ما لم يخطر أياً من الطرفين الطرف الأخر رسمياً بتغير أو تعديل هذا العنوان بموجب خطاب مسجل بعلم الوصول. يتم الاعتداد بالمراسلات والمخاطبات الخاصة بمعاملات تنفيذ هذا العقد إذا كانت من خلال البريد الاليكتروني أو الفاكس أو التسليم باليد متى كانت صادرة من الممثل المعتمد لكل طرف.
        </div>

        <div class="band-title">البند الرابع عشر <span class="band-title-sub">(الاختصاص القضائي)</span></div>
        <div class="section-content">
            تختص محكمة القاهرة الجديدة الابتدائية وجزئيتها بالنظر في أي نزاع لا قدر الله بشأن تنفيذ او تفسير أي بند من بنود هذا العقد.
        </div>

        <div class="band-title">البند الخامس عشر</div>
        <div class="section-content">
            تحـرر هذا العقد باللغة العربية من نسختين أصليتين، بيد كل طرف نسخة أصلية مكونة من أربع صفحات تحتوي كل نسخة على خمسة عشر بنداً، وقد تسلم كل طرف نسخته كاملة بعد استيفاء توقيعها من الطرف الأخر لتنفيذ ما ورد بها من التزامات وللعمل بموجبها عند اللزوم.
        </div>

        <!-- Signatures -->
        <div class="signatures">
            <div class="signature-box">
                <h4>الطـرف الأول (مؤدي الخدمة)</h4>
                <p><strong>Concept Eco Care</strong></p>
                <p>كونسبت للخدمات البيئية</p>
                <p>جمع ونقل النفايات الطبية</p>
                <br>
                <p><strong>ويوقع عنها:</strong></p>
                <p>السيد/ عبد الرحمن مصطفى طه محمدي عسوس</p>
                <p><em>بصفته: مالك ومدير عام المنشأة</em></p>
                <div class="signature-line">التوقيع والختم</div>
            </div>
            <div class="signature-box">
                <h4>الطـرف الثاني (العميل)</h4>
                <p><strong>إسم المنشأة:</strong></p>
                <p><span class="field-value">${clientName || '...............................'}</span></p>
                <br>
                <p><strong>ويوقع عنها:</strong></p>
                <p>الأستاذ/ <span class="field-value-inline">${managerName || '...............................'}</span></p>
                <p><em>بصفته: المدير المسئول</em></p>
                <div class="signature-line">التوقيع والختم</div>
            </div>
        </div>
    </body>
    </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(contractHTML);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
        }, 300);
    }
    
    return true;
};
