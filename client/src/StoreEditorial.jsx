import React from 'react';
import {ArrowLeft,ArrowUpLeft,Heart,ShoppingBag,Search,Plus,Phone,Truck,ShieldCheck,Gift,LoaderCircle} from 'lucide-react';
import {money} from './api';
import {readPromotions} from './promotions';
import {Watch,Wallet,Glasses,KeyRound} from 'lucide-react';
import './fonts.css';
import './editorial.css';

const PHONE='+970594954420';
function Instagram({size=20}){return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none"/></svg>}
const Gem=()=><svg className="gem" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0l5 5-5 5-5-5z" fill="currentColor"/></svg>;

export default function StoreEditorial({data,error,load,products,cats,settings,visible,category,selectCat,setCategory,search,setSearch,sort,setSort,favorites,fav,count,openCart,setPolicy,setDetail,add}){
 const footer=data?.settings?.footer||{};
 const instagram=footer.instagram||'https://www.instagram.com/jasmin.store.12/';
 const creditPhone=footer.credit_phone||PHONE;
 const instagramLabel=instagram ? '@'+new URL(instagram).pathname.split('/').filter(Boolean)[0] : '';
 return <div className="editorial">
  <div className="lx-topline"><span>شنط لكل إطلالة</span>{instagram&&<a href={instagram} target="_blank" rel="noopener noreferrer"><Instagram size={14}/><span dir="ltr">{instagramLabel}</span></a>}</div>
  <header className="lx-header">
   <a href="/" className="lx-brand" aria-label="ياسمين ستور، الصفحة الرئيسية"><span className="lx-brand-ar">ياسمين ستور</span><span className="lx-brand-en" dir="ltr">Jasmine Store</span></a>
   <nav aria-label="القائمة الرئيسية"><a href="#shop" onClick={()=>setCategory('all')}>المجموعة</a><a href="#categories">عوالمنا</a><button onClick={()=>setPolicy('about')}>عن المتجر</button></nav>
   <div className="lx-actions"><button aria-label="عرض المفضلة" onClick={()=>selectCat('favorites')}><Heart size={20}/>{favorites.length>0&&<small>{favorites.length}</small>}</button><button aria-label={`سلة التسوق، ${count} منتجات`} onClick={openCart}><ShoppingBag size={20}/><b>{count}</b></button></div>
  </header>
  <main>
   <section className="lx-hero" aria-labelledby="hero-title">
    <div className="lx-hero-copy">
     <h1 id="hero-title">شنطة بتكمّل<br/><span>حكاية إطلالتك.</span></h1>
     <p>مكياج وعناية وعطور وإكسسوارات، مختارة بذوق رفيع لتكمل إطلالتك.</p>
     <div className="lx-hero-actions"><a className="lx-cta" href="#shop" onClick={()=>setCategory('all')}>تصفّحي المجموعة<ArrowLeft size={18}/></a><button className="lx-ghost" onClick={()=>setPolicy('delivery')}>التوصيل والدفع</button></div>
    </div>
    <div className="lx-hero-arch" aria-hidden="false"><div className="arch-outer"><div className="arch-inner"><img src="/art/jasmine-hero.jpg" alt="شنطة جلد وردية فاتحة" fetchPriority="high"/></div></div></div>
   </section>
   <PromotionGallery footer={footer}/>
   <div className="lx-promise"><span><Truck size={18}/>توصيل إلى بابك</span><Gem/><span><ShieldCheck size={18}/>الدفع عند الاستلام</span><Gem/><span><Gift size={18}/>مختارة بعناية</span></div>
   <section id="categories" className="lx-worlds" aria-labelledby="worlds-title">
    <div className="lx-heading center"><h2 id="worlds-title">عوالم ياسمين ستور</h2><p>اختاري العالم الأقرب إليكِ.</p></div>
    <div className="lx-arches">{cats.map(c=><button key={c.id} onClick={()=>selectCat(c.id)} className="lx-world"><span className="world-arch"><CategoryImage category={c}/></span><strong>{c.name}</strong></button>)}</div>
   </section>
   <section id="shop" className="lx-shop" aria-labelledby="collection-title">
    <div className="lx-heading center"><h2 id="collection-title">{category==='favorites'?'قطع أحببتِها':'المجموعة'}</h2><p>{visible.length} قطعة مختارة</p></div>
    <div className="lx-filters"><div className="lx-tabs"><button className={category==='all'?'is-active':''} onClick={()=>setCategory('all')}>كل القطع</button>{cats.map(c=><button className={category===c.id?'is-active':''} key={c.id} onClick={()=>setCategory(c.id)}>{c.name}</button>)}</div><div className="lx-tools"><label className="lx-search"><Search size={16}/><input placeholder="ابحثي عن قطعتك" value={search} onChange={e=>setSearch(e.target.value)} aria-label="البحث في المنتجات"/></label><select aria-label="ترتيب المنتجات" value={sort} onChange={e=>setSort(e.target.value)}><option value="new">الأحدث</option><option value="low">السعر: الأقل أولًا</option><option value="high">السعر: الأعلى أولًا</option></select></div></div>
    {data?.mode==='setup'&&<div className="lx-demo-note">معاينة المتجر — القطع والأسعار توضيحية، وسيُتاح الطلب بعد إتمام التجهيز.</div>}
    {error&&<div role="alert" className="error">{error}<button onClick={load}>إعادة المحاولة</button></div>}
    {!data&&!error&&<div className="empty"><LoaderCircle className="spin"/> نجهّز لكِ المجموعة…</div>}
    <div className="lx-products">{visible.map(p=><article className="lx-product" key={p.id}>
     <div className="lx-piece"><button className={'lx-heart '+(favorites.includes(p.id)?'saved':'')} aria-label={favorites.includes(p.id)?'إزالة من المفضلة':'إضافة للمفضلة'} aria-pressed={favorites.includes(p.id)} onClick={()=>fav(p.id)}><Heart size={18}/></button><button className="lx-piece-img" onClick={()=>setDetail(p)} aria-label={'عرض تفاصيل '+p.name}><img src={p.image_url} alt={p.name} loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/art/jasmine-hero.jpg'}}/></button>{p.is_demo&&<span className="lx-flag">قطعة توضيحية</span>}{p.stock<1&&<span className="lx-flag sold">غير متوفر</span>}</div>
     <div className="lx-info"><span className="lx-cat">{cats.find(c=>c.id===p.category_id)?.name}</span><h3><button onClick={()=>setDetail(p)}>{p.name}</button></h3><div className="jasmine-prices"><span className="lx-price">{money(p.price)}</span>{p.original_price>p.price&&<><del>{money(p.original_price)}</del><span className="jasmine-discount">خصم {Math.max(1,Math.floor((p.original_price-p.price)*100/p.original_price))}%</span></>}</div><button className="lx-add" disabled={p.stock<1} onClick={()=>add(p)}><span>{p.stock<1?'نفدت الكمية':'أضيفي إلى الحقيبة'}</span><Plus size={16}/></button></div>
    </article>)}</div>
    {data&&visible.length===0&&<div className="empty"><Search size={28}/><h3>قطعتك بانتظارك</h3><p>لم نجد منتجات بهذا الاختيار. جرّبي قسمًا أو كلمة أخرى.</p><button className="secondary" onClick={()=>{setSearch('');setCategory('all')}}>تصفّحي كل القطع</button></div>}
   </section>
   
  </main>
  <footer className="lx-footer"><div className="lx-footer-top"><div className="lx-footer-brand"><a href="/" className="lx-brand"><span className="lx-brand-ar">ياسمين ستور</span><span className="lx-brand-en" dir="ltr">Jasmine Store</span></a><p>{footer.tagline||'للتفاصيل التي تجعلكِ أنتِ.'}</p>{instagram&&<a className="footer-instagram" href={instagram} target="_blank" rel="noopener noreferrer"><Instagram size={18}/><span dir="ltr">{instagramLabel}</span></a>}</div><div className="lx-footer-links"><h3>{footer.discovery_heading||'اكتشفي'}</h3><a href="#shop" onClick={()=>setCategory('all')}>{footer.collection_label||"المجموعة كاملة"}</a><a href="#categories">{footer.categories_label||"عوالمنا"}</a><button onClick={()=>setPolicy('about')}>{footer.about_label||"عن المتجر"}</button></div><div className="lx-footer-links"><h3>{footer.support_heading||'نحن بالقرب'}</h3><button onClick={()=>setPolicy('contact')}>{footer.contact_label||"تواصلي معنا"}</button><button onClick={()=>setPolicy('delivery')}>{footer.delivery_label||"التوصيل والدفع"}</button><button onClick={()=>setPolicy('returns')}>الاستبدال والإرجاع</button><button onClick={()=>setPolicy('privacy')}>{footer.privacy_label||"سياسة الخصوصية"}</button></div></div>
  <div className="lx-credits"><div className="developer-credit" dir="ltr"><span>{footer.credit||'© 2026 DS Technologies | Developed by Duha Soqi.'}</span><a href={'tel:'+creditPhone} aria-label="اتصال بمطوّرة الموقع Duha Soqi"><Phone size={13}/><span>{footer.credit_phone||'+970 594 954 420'}</span></a></div><a href="/admin">إدارة المتجر <ArrowUpLeft size={13}/></a></div></footer>
 </div>;
}

function PromotionGallery({footer}) {
 const offers=readPromotions(footer);
 const [active,setActive]=React.useState(0);
 const [paused,setPaused]=React.useState(false);
 const [engaged,setEngaged]=React.useState(false);
 const start=React.useRef(null);
 const count=offers.length;
 const index=count ? active%count : 0;
 function move(direction){setActive(current=>(current+direction+count)%count)}
 React.useEffect(()=>{
  if(count<2||paused||engaged||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const timer=setTimeout(()=>setActive(current=>(current+1)%count),5000);
  return ()=>clearTimeout(timer);
 },[count,index,paused,engaged]);
 if(!count)return null;
 return <section className="jasmine-promos" aria-labelledby="promo-title"
  onMouseEnter={()=>setEngaged(true)} onMouseLeave={()=>setEngaged(false)}
  onFocus={event=>{if(event.target.matches(':focus-visible'))setPaused(true)}}>
  <h2 id="promo-title">العروض الحالية</h2>
  <div className="promo-window" dir="ltr"
   onTouchStart={event=>{start.current=event.touches[0].clientX;setPaused(true)}}
   onTouchEnd={event=>{
    const distance=event.changedTouches[0].clientX-(start.current??event.changedTouches[0].clientX);
    start.current=null;
    if(count>1&&Math.abs(distance)>45)move(distance<0?1:-1);
   }}>
   <div className="promo-track" style={{transform:'translateX(-'+index*100+'%)'}}>
    {offers.map((offer,i)=><div className="promo-slide" dir="rtl" key={i} aria-hidden={i!==index}>
     <img src={offer.image} alt={offer.title||'إعلان من ياسمين ستور'} loading={i===0?'eager':'lazy'}/>
     {offer.title&&<strong>{offer.title}</strong>}
    </div>)}
   </div>
  </div>
  {count>1&&<div className="promo-controls">
   <button type="button" aria-label="الإعلان السابق" onClick={()=>move(-1)}>›</button>
   <span aria-live={paused?'polite':'off'}>{index+1} / {count}</span>
   <button type="button" aria-label="الإعلان التالي" onClick={()=>move(1)}>‹</button>
   <button type="button" onClick={()=>setPaused(!paused)}>{paused?'تشغيل العرض':'إيقاف العرض'}</button>
  </div>}
 </section>;
}

function CategoryImage({category}) {
 const [failed,setFailed]=React.useState(null);
 const name=category.name.replace(/[أإآ]/g,'ا');
 const Icon=/ساع/.test(name)?Watch:/محافظ/.test(name)?Wallet:/نظار/.test(name)?Glasses:/ميدال/.test(name)?KeyRound:ShoppingBag;
 const fallback=/عط[ر و]/.test(name)?'/art/perfume.svg':/شنط|حق[يا]ئ?ب/.test(name)?'/art/jasmine-hero.jpg':null;
 const image=category.image_url && failed!==category.image_url?category.image_url:fallback;
 return image?<img src={image} alt="" loading="lazy" onError={()=>setFailed(image)}/>:<Icon size={55} aria-hidden="true"/>;
}
