-- Reference data only: safe for fresh development or production projects.
insert into public.categories(id,name,emoji,color) values
('electronics','Đồ điện tử','🎧','#6366f1'),('bags','Túi & ba lô','🎒','#0ea5e9'),
('wallets','Ví & thẻ','👛','#f59e0b'),('keys','Chìa khoá','🔑','#ef4444'),
('clothing','Quần áo & phụ kiện','🧥','#ec4899'),('books','Sách & văn phòng phẩm','📚','#10b981'),
('id-docs','Giấy tờ & thẻ','🪪','#14b8a6'),('bottles','Bình nước','🥤','#3b82f6'),
('umbrellas','Ô / dù','☂️','#8b5cf6'),('other','Khác','📦','#64748b') on conflict(id) do nothing;
insert into public.locations(id,name,kind) values
('alpha','Toà Alpha','building'),('beta','Toà Beta','building'),('gamma','Toà Gamma','building'),
('library','Thư viện','building'),('canteen','Căng tin','building'),('parking','Bãi giữ xe','area'),
('sports','Khu thể thao','building'),('dorm','Ký túc xá','building'),('self-study','Khu tự học','area'),
('outdoor','Khu vực ngoài trời','area') on conflict(id) do nothing;
