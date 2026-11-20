import React from 'react';
import {ArrowLeft,ArrowUpLeft,Heart,ShoppingBag,Search,Plus,Phone,Truck,ShieldCheck,Gift,LoaderCircle} from 'lucide-react';
import {money} from './api';
import './fonts.css';
import './editorial.css';

const INSTAGRAM='https://www.instagram.com/accesswarty.store/';
const PHONE='+970594954420';
const art=['lipstick','cream','perfume','jewel'];
const descriptions=['لون يعبّر عنك','مساحة للعناية بذاتك','أثر جميل يبقى','أناقة في التفاصيل'];
function Instagram({size=20}){return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none"/></svg>}
const Gem=()=><svg className="gem" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0l5 5-5 5-5-5z" fill="currentColor"/></svg>;

export default function StoreEditorial({data,error,load,products,cats,settings,visible,category,selectCat,setCategory,search,setSearch,sort,setSort,favorites,fav,count,openCart,setPolicy,setDetail,add}){
 return <div className="editorial">
  <div className="lx-topline"><span>الجمال في التفاصيل</span><a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"><Instagram size={14}/><span dir="ltr">@accesswarty.store</span></a></div>
  <header className="lx-header">
   <a href="/" className="lx-brand" aria-label="اكسسواراتي، الصفحة الرئيسية"><span className="lx-brand-ar">اكسسواراتي</span><span className="lx-brand-en" dir="ltr">Accessorati</span></a>
   <nav aria-label="القائمة الرئيسية"><a href="#shop" onClick={()=>setCategory('all')}>المجموعة</a><a href="#categories">عوالمنا</a><button onClick={()=>setPolicy('about')}>عن المتجر</button></nav>
   <div className="lx-actions"><button aria-label="عرض المفضلة" onClick={()=>selectCat('favorites')}><Heart size={20}/>{favorites.length>0&&<small>{favorites.length}</small>}</button><button aria-label={`سلة التسوق، ${count} منتجات`} onClick={openCart}><ShoppingBag size={20}/><b>{count}</b></button></div>
  </header>
  <main>
   <section className="lx-hero" aria-labelledby="hero-title">
    <div className="lx-hero-copy">
     <h1 id="hero-title">تفصيلٌ صغير،<br/><span>حضورٌ لا يُنسى.</span></h1>
     <p>مكياج وعناية وعطور وإكسسوارات، مختارة بذوق رفيع لتكمل إطلالتك.</p>
     <div className="lx-hero-actions"><a className="lx-cta" href="#shop" onClick={()=>setCategory('all')}>تصفّحي المجموعة<ArrowLeft size={18}/></a><button className="lx-ghost" onClick={()=>setPolicy('delivery')}>التوصيل والدفع</button></div>
    </div>
    <div className="lx-hero-arch" aria-hidden="false"><div className="arch-outer"><div className="arch-inner"><img src="/art/atelier.svg" alt="تنسيق فني لعطر وردي وسلسال ذهبي وأحمر شفاه فوق قواعد عاجية" fetchPriority="high"/></div></div></div>
   </section>
   <div className="lx-promise"><span><Truck size={18}/>توصيل إلى بابك</span><Gem/><span><ShieldCheck size={18}/>الدفع عند الاستلام</span><Gem/><span><Gift size={18}/>مختارة بعناية</span></div>
   <section id="categories" className="lx-worlds" aria-labelledby="worlds-title">
    <div className="lx-heading center"><h2 id="worlds-title">عوالم اكسسواراتي</h2><p>اختاري العالم الأقرب إليكِ.</p></div>
    <div className="lx-arches">{cats.map((c,i)=><button key={c.id} onClick={()=>selectCat(c.id)} className="lx-world"><span className="world-arch"><img src={'/art/'+art[i%4]+'.svg'} alt="" loading="lazy"/></span><strong>{c.name}</strong><small>{descriptions[i%4]}</small></button>)}</div>
   </section>
   <section id="shop" className="lx-shop" aria-labelledby="collection-title">
    <div className="lx-heading center"><h2 id="collection-title">{category==='favorites'?'قطع أحببتِها':'المجموعة'}</h2><p>{visible.length} قطعة مختارة</p></div>
    <div className="lx-filters"><div className="lx-tabs"><button className={category==='all'?'is-active':''} onClick={()=>setCategory('all')}>كل القطع</button>{cats.map(c=><button className={category===c.id?'is-active':''} key={c.id} onClick={()=>setCategory(c.id)}>{c.name}</button>)}</div><div className="lx-tools"><label className="lx-search"><Search size={16}/><input placeholder="ابحثي عن قطعتك" value={search} onChange={e=>setSearch(e.target.value)} aria-label="البحث في المنتجات"/></label><select aria-label="ترتيب المنتجات" value={sort} onChange={e=>setSort(e.target.value)}><option value="new">الأحدث</option><option value="low">السعر: الأقل أولًا</option><option value="high">السعر: الأعلى أولًا</option></select></div></div>
    {data?.mode==='setup'&&<div className="lx-demo-note">معاينة المتجر — القطع والأسعار توضيحية، وسيُتاح الطلب بعد إتمام التجهيز.</div>}
    {error&&<div role="alert" className="error">{error}<button onClick={load}>إعادة المحاولة</button></div>}
    {!data&&!error&&<div className="empty"><LoaderCircle className="spin"/> نجهّز لكِ المجموعة…</div>}
    <div className="lx-products">{visible.map(p=><article className="lx-product" key={p.id}>
     <div className="lx-piece"><button className={'lx-heart '+(favorites.includes(p.id)?'saved':'')} aria-label={favorites.includes(p.id)?'إزالة من المفضلة':'إضافة للمفضلة'} aria-pressed={favorites.includes(p.id)} onClick={()=>fav(p.id)}><Heart size={18}/></button><button className="lx-piece-img" onClick={()=>setDetail(p)} aria-label={'عرض تفاصيل '+p.name}><img src={p.image_url} alt={p.name} loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/art/cream.svg'}}/></button>{p.is_demo&&<span className="lx-flag">قطعة توضيحية</span>}{p.stock<1&&<span className="lx-flag sold">غير متوفر</span>}</div>
     <div className="lx-info"><span className="lx-cat">{cats.find(c=>c.id===p.category_id)?.name}</span><h3><button onClick={()=>setDetail(p)}>{p.name}</button></h3><span className="lx-price">{money(p.price)}</span><button className="lx-add" disabled={p.stock<1} onClick={()=>add(p)}><span>{p.stock<1?'نفدت الكمية':'أضيفي إلى الحقيبة'}</span><Plus size={16}/></button></div>
    </article>)}</div>
    {data&&visible.length===0&&<div className="empty"><Search size={28}/><h3>قطعتك بانتظارك</h3><p>لم نجد منتجات بهذا الاختيار. جرّبي قسمًا أو كلمة أخرى.</p><button className="secondary" onClick={()=>{setSearch('');setCategory('all')}}>تصفّحي كل القطع</button></div>}
   </section>
   <section className="lx-insta"><div className="insta-frame"><div className="insta-text"><h2>كوني أقرب للأشياء الحلوة</h2><p>إطلالات واختيارات جديدة وتفاصيل من عالم اكسسواراتي، على إنستغرام كل يوم.</p><a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="lx-cta"><Instagram size={18}/><span dir="ltr">@accesswarty.store</span></a></div><div className="insta-arch"><div className="arch-outer small"><div className="arch-inner"><img src="/art/jewel.svg" alt="سلسال ذهبي بقلب وردي" loading="lazy"/></div></div></div></div></section>
  </main>
  <footer className="lx-footer"><div className="lx-footer-top"><div className="lx-footer-brand"><a href="/" className="lx-brand"><span className="lx-brand-ar">اكسسواراتي</span><span className="lx-brand-en" dir="ltr">Accessorati</span></a><p>للتفاصيل التي تجعلكِ أنتِ.</p><a className="footer-instagram" href={INSTAGRAM} target="_blank" rel="noopener noreferrer"><Instagram size={18}/><span dir="ltr">@accesswarty.store</span></a></div><div className="lx-footer-links"><h3>اكتشفي</h3><a href="#shop" onClick={()=>setCategory('all')}>المجموعة كاملة</a><a href="#categories">عوالمنا</a><button onClick={()=>setPolicy('about')}>عن المتجر</button></div><div className="lx-footer-links"><h3>نحن بالقرب</h3><button onClick={()=>setPolicy('contact')}>تواصلي معنا</button><button onClick={()=>setPolicy('delivery')}>التوصيل والدفع</button><button onClick={()=>setPolicy('returns')}>الاستبدال والإرجاع</button><button onClick={()=>setPolicy('privacy')}>سياسة الخصوصية</button></div></div>
  <div className="lx-credits"><div className="developer-credit" dir="ltr"><span>© 2026 DS Technologies | Developed by Duha Soqi.</span><a href={'tel:'+PHONE} aria-label="اتصال بمطوّرة الموقع Duha Soqi"><Phone size={13}/><span>+970 594 954 420</span></a></div><a href="/admin">إدارة المتجر <ArrowUpLeft size={13}/></a></div></footer>
 </div>;
}
