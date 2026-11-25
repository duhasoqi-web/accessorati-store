
export const promotionKey = /^(promo_image|promo_title)_[1-9][0-9]*$/;

export function readPromotions(footer) {
 return Object.keys(footer).filter(key => key.startsWith('promo_image_') && promotionKey.test(key) && footer[key])
  .map(key => key.slice('promo_image_'.length)).sort((a,b) => Number(a)-Number(b))
  .map(number => ({image:footer['promo_image_'+number],title:footer['promo_title_'+number]||''}));
}
