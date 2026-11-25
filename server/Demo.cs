static class Demo {
 public static object Catalog => new {
  mode = "setup",
  settings = new { accepting_orders = false, shipping_fee = 0, contact_phone = "", delivery_note = "" },
  categories = new[] { new { id = "demo-bags", name = "شنط كتف", image_url = "/art/jasmine-hero.jpg" } },
  products = new[] { new { id = "demo-rose-bag", name = "شنطة وردية بمقبض قصير", category_id = "demo-bags",
   description = "معاينة لشكل بطاقة الشنطة وتنسيق السعر والخصم.", price = 8900, original_price = 11900,
   stock = 1, image_url = "/art/jasmine-hero.jpg", active = true, is_demo = true } }
 };
}
