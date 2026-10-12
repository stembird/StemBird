-- Seed towns via migration (idempotent via ON CONFLICT)
BEGIN;

-- Ensure towns table exists
DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'towns';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table public.towns does not exist; run migrations creating towns first.';
  END IF;
END $$;

-- Inline seed content (idempotent via ON CONFLICT)

-- 1. Baringo (county_id = 1)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kabarnet', 1, 'kabarnet'),
  ('Eldama Ravine', 1, 'eldama-ravine'),
  ('Marigat', 1, 'marigat'),
  ('Kabartonjo', 1, 'kabartonjo'),
  ('Mogotio', 1, 'mogotio'),
  ('Tenges', 1, 'tenges'),
  ('Barwessa', 1, 'barwessa'),
  ('Bartabwa', 1, 'bartabwa'),
  ('Kabarnet Town', 1, 'kabarnet-town'),
  ('Kisanana', 1, 'kisanana'),
  ('Kabenes', 1, 'kabenes'),
  ('Riong’ak', 1, 'riongak')
ON CONFLICT (name, county_id) DO NOTHING;

-- 2. Bomet (county_id = 2)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Bomet', 2, 'bomet'),
  ('Sotik', 2, 'sotik'),
  ('Mulot', 2, 'mulot'),
  ('Chebunyo', 2, 'chebunyo'),
  ('Litein', 2, 'litein'),
  ('Kapkugerwet', 2, 'kapkugerwet'),
  ('Mogogosiek', 2, 'mogogosiek'),
  ('Bomet Town', 2, 'bomet-town'),
  ('Silibwet', 2, 'silibwet')
ON CONFLICT (name, county_id) DO NOTHING;

-- 3. Bungoma (county_id = 3)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Bungoma', 3, 'bungoma'),
  ('Webuye', 3, 'webuye'),
  ('Kimilili', 3, 'kimilili'),
  ('Chwele', 3, 'chwele'),
  ('Sirisia', 3, 'sirisia'),
  ('Bungoma Town', 3, 'bungoma-town'),
  ('Tongaren', 3, 'tongaren'),
  ('Kapsokwony', 3, 'kapsokwony'),
  ('Malakisi', 3, 'malakisi'),
  ('Kabula', 3, 'kabula'),
  ('Webuye East', 3, 'webuye-east'),
  ('Kanduyi', 3, 'kanduyi')
ON CONFLICT (name, county_id) DO NOTHING;

-- 4. Busia (county_id = 4)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Busia', 4, 'busia'),
  ('Malaba', 4, 'malaba'),
  ('Nambale', 4, 'nambale'),
  ('Funyula', 4, 'funyula'),
  ('Butula', 4, 'butula'),
  ('Teso North (Amagoro)', 4, 'teso-north-amagoro'),
  ('Budalangi', 4, 'budalangi'),
  ('Samia', 4, 'samia'),
  ('Busia Town', 4, 'busia-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 5. Elgeyo-Marakwet (county_id = 5)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Iten', 5, 'iten'),
  ('Kapsowar', 5, 'kapsowar'),
  ('Kieno', 5, 'kieno'),
  ('Kapyego', 5, 'kapyego'),
  ('Chepkorio', 5, 'chepkorio'),
  ('Chebara', 5, 'chebara'),
  ('Embobut', 5, 'embobut'),
  ('Kapkuikui', 5, 'kapkuikui'),
  ('Tot', 5, 'tot'),
  ('Talai', 5, 'talai'),
  ('Iten Town', 5, 'iten-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 6. Embu (county_id = 6)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Embu', 6, 'embu'),
  ('Runyenjes', 6, 'runyenjes'),
  ('Siakago (Mbeere)', 6, 'siakago-mbeere'),
  ('Kiritiri', 6, 'kiritiri'),
  ('Karurumo', 6, 'karurumo'),
  ('Kianjai', 6, 'kianjai'),
  ('Manyatta', 6, 'manyatta'),
  ('Embu Town', 6, 'embu-town'),
  ('Kangaru', 6, 'kangaru')
ON CONFLICT (name, county_id) DO NOTHING;

-- 7. Garissa (county_id = 7)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Garissa', 7, 'garissa'),
  ('Dadaab', 7, 'dadaab'),
  ('Modika', 7, 'modika'),
  ('Hulugho', 7, 'hulugho'),
  ('Fafi', 7, 'fafi'),
  ('Balambala', 7, 'balambala'),
  ('Lagdera', 7, 'lagdera'),
  ('Ijara', 7, 'ijara'),
  ('Madogo', 7, 'madogo'),
  ('Garissa Town', 7, 'garissa-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 8. Homa Bay (county_id = 8)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Homa Bay', 8, 'homa-bay'),
  ('Mbita', 8, 'mbita'),
  ('Oyugis', 8, 'oyugis'),
  ('Kendu Bay', 8, 'kendu-bay'),
  ('Rodi', 8, 'rodi'),
  ('Sindo', 8, 'sindo'),
  ('Rangwe', 8, 'rangwe'),
  ('Kabondo', 8, 'kabondo'),
  ('Ndhiwa', 8, 'ndhiwa'),
  ('Homa Bay Town', 8, 'homa-bay-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 9. Isiolo (county_id = 9)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Isiolo', 9, 'isiolo'),
  ('Garbatulla', 9, 'garbatulla'),
  ('Kinna', 9, 'kinna'),
  ('Sericho', 9, 'sericho'),
  ('Oldonyiro', 9, 'oldonyiro'),
  ('Merti', 9, 'merti'),
  ('Jima', 9, 'jima'),
  ('Kulamawe', 9, 'kulamawe'),
  ('Isiolo Town', 9, 'isiolo-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 10. Kajiado (county_id = 10)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kajiado', 10, 'kajiado'),
  ('Kitengela', 10, 'kitengela'),
  ('Ongata Rongai', 10, 'ongata-rongai'),
  ('Ngong', 10, 'ngong'),
  ('Namanga', 10, 'namanga'),
  ('Isinya', 10, 'isinya'),
  ('Kajiado Town', 10, 'kajiado-town'),
  ('Maili Tisa', 10, 'maili-tisa'),
  ('Kitonyoni', 10, 'kitonyoni')
ON CONFLICT (name, county_id) DO NOTHING;

-- 11. Kakamega (county_id = 11)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kakamega', 11, 'kakamega'),
  ('Mumias', 11, 'mumias'),
  ('Malava', 11, 'malava'),
  ('Butere', 11, 'butere'),
  ('Shinyalu', 11, 'shinyalu'),
  ('Lurambi', 11, 'lurambi'),
  ('Ikolomani', 11, 'ikolomani'),
  ('Matungu', 11, 'matungu'),
  ('Khwisero', 11, 'khwisero'),
  ('Likuyani', 11, 'likuyani')
ON CONFLICT (name, county_id) DO NOTHING;

-- 12. Kericho (county_id = 12)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kericho', 12, 'kericho'),
  ('Londiani', 12, 'londiani'),
  ('Litein', 12, 'litein-kericho'),
  ('Ainamoi', 12, 'ainamoi'),
  ('Kipkelion', 12, 'kipkelion'),
  ('Kapkatet', 12, 'kapkatet'),
  ('Kabianga', 12, 'kabianga'),
  ('Zedern', 12, 'zedern'),
  ('Belgut', 12, 'belgut')
ON CONFLICT (name, county_id) DO NOTHING;

-- 13. Kiambu (county_id = 13)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kiambu Town', 13, 'kiambu-town'),
  ('Thika', 13, 'thika'),
  ('Ruiru', 13, 'ruiru'),
  ('Limuru', 13, 'limuru'),
  ('Githunguri', 13, 'githunguri'),
  ('Kikuyu', 13, 'kikuyu'),
  ('Juja', 13, 'juja'),
  ('Gatundu', 13, 'gatundu'),
  ('Karuri', 13, 'karuri'),
  ('Kiambu', 13, 'kiambu'),
  ('Kabete', 13, 'kabete'),
  ('Wangige', 13, 'wangige'),
  ('Kiambu Road towns', 13, 'kiambu-road-towns')
ON CONFLICT (name, county_id) DO NOTHING;

-- 14. Kilifi (county_id = 14)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kilifi', 14, 'kilifi'),
  ('Malindi', 14, 'malindi'),
  ('Watamu', 14, 'watamu'),
  ('Mariakani', 14, 'mariakani'),
  ('Kaloleni', 14, 'kaloleni'),
  ('Kilifi Town', 14, 'kilifi-town'),
  ('Mpeketoni', 14, 'mpeketoni-kilifi'),
  ('Rabai', 14, 'rabai'),
  ('Ganze', 14, 'ganze'),
  ('Marafa', 14, 'marafa')
ON CONFLICT (name, county_id) DO NOTHING;

-- 15. Kirinyaga (county_id = 15)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kerugoya', 15, 'kerugoya'),
  ('Kutus', 15, 'kutus'),
  ('Sagana', 15, 'sagana'),
  ('Kagio', 15, 'kagio'),
  ('Wanguru', 15, 'wanguru'),
  ('Kianyaga', 15, 'kianyaga'),
  ('Mukure', 15, 'mukure'),
  ('Makutano', 15, 'makutano'),
  ('Kirinyaga', 15, 'kirinyaga'),
  ('Kerugoya Town', 15, 'kerugoya-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 16. Kisii (county_id = 16)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kisii', 16, 'kisii'),
  ('Ogembo', 16, 'ogembo'),
  ('Nyamache', 16, 'nyamache'),
  ('Tabaka', 16, 'tabaka'),
  ('Nyamira', 16, 'nyamira'),
  ('Bomachoge', 16, 'bomachoge'),
  ('Gesusu', 16, 'gesusu'),
  ('Kitutu Chache towns', 16, 'kitutu-chache-towns'),
  ('Kisii Town', 16, 'kisii-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 17. Kisumu (county_id = 17)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kisumu', 17, 'kisumu'),
  ('Ahero', 17, 'ahero'),
  ('Maseno', 17, 'maseno'),
  ('Muhoroni', 17, 'muhoroni'),
  ('Nyando', 17, 'nyando'),
  ('Seme', 17, 'seme'),
  ('Kibos', 17, 'kibos'),
  ('Kisumu Town', 17, 'kisumu-town'),
  ('Kondele', 17, 'kondele'),
  ('Manyatta', 17, 'manyatta-kisumu'),
  ('Migosi', 17, 'migosi')
ON CONFLICT (name, county_id) DO NOTHING;

-- 18. Kitui (county_id = 18)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kitui', 18, 'kitui'),
  ('Mwingi', 18, 'mwingi'),
  ('Mutomo', 18, 'mutomo'),
  ('Kyuso', 18, 'kyuso'),
  ('Kwa Vonza', 18, 'kwa-vonza'),
  ('Kibwezi', 18, 'kibwezi-kitui'),
  ('Ikutha', 18, 'ikutha'),
  ('Kitui Town', 18, 'kitui-town'),
  ('Machakos-border towns', 18, 'machakos-border-towns')
ON CONFLICT (name, county_id) DO NOTHING;

-- 19. Kwale (county_id = 19)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kwale', 19, 'kwale'),
  ('Ukunda', 19, 'ukunda'),
  ('Msambweni', 19, 'msambweni'),
  ('Kinango', 19, 'kinango'),
  ('Lunga Lunga', 19, 'lunga-lunga'),
  ('Diani', 19, 'diani'),
  ('Tsunza', 19, 'tsunza'),
  ('Kwale Town', 19, 'kwale-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 20. Laikipia (county_id = 20)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Nanyuki', 20, 'nanyuki'),
  ('Rumuruti', 20, 'rumuruti'),
  ('Nyahururu', 20, 'nyahururu'),
  ('Dol Dol', 20, 'dol-dol'),
  ('Ng’arua', 20, 'ngarua'),
  ('Timau', 20, 'timau'),
  ('Nanyuki Town', 20, 'nanyuki-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 21. Lamu (county_id = 21)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Lamu', 21, 'lamu'),
  ('Mpeketoni', 21, 'mpeketoni'),
  ('Faza', 21, 'faza'),
  ('Shela', 21, 'shela'),
  ('Lamu Old Town', 21, 'lamu-old-town'),
  ('Kiunga', 21, 'kiunga'),
  ('Mokowe', 21, 'mokowe'),
  ('Witu', 21, 'witu')
ON CONFLICT (name, county_id) DO NOTHING;

-- 22. Machakos (county_id = 22)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Machakos', 22, 'machakos'),
  ('Kangundo', 22, 'kangundo'),
  ('Matuu', 22, 'matuu'),
  ('Tala', 22, 'tala'),
  ('Kathiani', 22, 'kathiani'),
  ('Athi River', 22, 'athi-river'),
  ('Masii', 22, 'masii'),
  ('Emali', 22, 'emali-machakos'),
  ('Machakos Town', 22, 'machakos-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 23. Makueni (county_id = 23)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Wote', 23, 'wote'),
  ('Kibwezi', 23, 'kibwezi'),
  ('Makindu', 23, 'makindu'),
  ('Emali', 23, 'emali'),
  ('Kathonzweni', 23, 'kathonzweni'),
  ('Makueni Town', 23, 'makueni-town'),
  ('Mbooni', 23, 'mbooni'),
  ('Kaiti', 23, 'kaiti')
ON CONFLICT (name, county_id) DO NOTHING;

-- 24. Mandera (county_id = 24)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Mandera Town', 24, 'mandera-town'),
  ('Elwak', 24, 'elwak'),
  ('Rhamu', 24, 'rhamu'),
  ('Banissa', 24, 'banissa'),
  ('Lafey', 24, 'lafey'),
  ('Takaba', 24, 'takaba'),
  ('Mandera East towns', 24, 'mandera-east-towns'),
  ('Arabia', 24, 'arabia')
ON CONFLICT (name, county_id) DO NOTHING;

-- 25. Marsabit (county_id = 25)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Marsabit', 25, 'marsabit'),
  ('Moyale', 25, 'moyale'),
  ('North Horr', 25, 'north-horr'),
  ('Saku', 25, 'saku'),
  ('Laisamis', 25, 'laisamis'),
  ('Merille', 25, 'merille'),
  ('Karare', 25, 'karare'),
  ('Korr', 25, 'korr'),
  ('Marsabit Town', 25, 'marsabit-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 26. Meru (county_id = 26)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Meru Town', 26, 'meru-town'),
  ('Maua', 26, 'maua'),
  ('Timau', 26, 'timau-meru'),
  ('Chuka', 26, 'chuka-meru'),
  ('Imenti', 26, 'imenti'),
  ('Kianjai', 26, 'kianjai-meru'),
  ('Nkubu', 26, 'nkubu-meru'),
  ('Buuri', 26, 'buuri')
ON CONFLICT (name, county_id) DO NOTHING;

-- 27. Migori (county_id = 27)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Migori', 27, 'migori'),
  ('Awendo', 27, 'awendo'),
  ('Rongo', 27, 'rongo'),
  ('Kehancha', 27, 'kehancha'),
  ('Oyugis', 27, 'oyugis-migori'),
  ('Macalder', 27, 'macalder'),
  ('Migori Town', 27, 'migori-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 28. Mombasa (county_id = 28)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Mombasa', 28, 'mombasa'),
  ('Likoni', 28, 'likoni'),
  ('Changamwe', 28, 'changamwe'),
  ('Nyali', 28, 'nyali'),
  ('Kisauni', 28, 'kisauni'),
  ('Bamburi', 28, 'bamburi'),
  ('Mtwapa', 28, 'mtwapa'),
  ('Port Reitz', 28, 'port-reitz'),
  ('Mombasa Town', 28, 'mombasa-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 29. Murang’a (county_id = 29)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Murang’a', 29, 'muranga'),
  ('Kangema', 29, 'kangema'),
  ('Kenol', 29, 'kenol'),
  ('Maragua', 29, 'maragua'),
  ('Kigumo', 29, 'kigumo'),
  ('Kijabe', 29, 'kijabe'),
  ('Maragua Town', 29, 'maragua-town'),
  ('Mathioya', 29, 'mathioya')
ON CONFLICT (name, county_id) DO NOTHING;

-- 30. Nairobi (county_id = 30)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Nairobi (CBD)', 30, 'nairobi-cbd'),
  ('Westlands', 30, 'westlands'),
  ('Industrial Area', 30, 'industrial-area'),
  ('Embakasi', 30, 'embakasi'),
  ('Kasarani', 30, 'kasarani'),
  ('Karen', 30, 'karen'),
  ('Lang’ata', 30, 'langata'),
  ('Dagoretti', 30, 'dagoretti'),
  ('Parklands', 30, 'parklands'),
  ('South C', 30, 'south-c'),
  ('South B', 30, 'south-b'),
  ('Lavington', 30, 'lavington'),
  ('Kilimani', 30, 'kilimani'),
  ('Upper Hill', 30, 'upper-hill'),
  ('Ruaraka', 30, 'ruaraka'),
  ('Roysambu', 30, 'roysambu')
ON CONFLICT (name, county_id) DO NOTHING;

-- 31. Nakuru (county_id = 31)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Nakuru', 31, 'nakuru'),
  ('Naivasha', 31, 'naivasha'),
  ('Gilgil', 31, 'gilgil'),
  ('Molo', 31, 'molo'),
  ('Subukia', 31, 'subukia'),
  ('Njoro', 31, 'njoro'),
  ('Eldama Ravine', 31, 'eldama-ravine-nakuru'),
  ('Bahati', 31, 'bahati'),
  ('Gilgil Town', 31, 'gilgil-town'),
  ('Rongai', 31, 'rongai'),
  ('Lanet', 31, 'lanet')
ON CONFLICT (name, county_id) DO NOTHING;

-- 32. Nandi (county_id = 32)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kapsabet', 32, 'kapsabet'),
  ('Nandi Hills', 32, 'nandi-hills'),
  ('Mosoriot', 32, 'mosoriot'),
  ('Tinderet', 32, 'tinderet'),
  ('Kabiyet', 32, 'kabiyet'),
  ('Nandi Town', 32, 'nandi-town'),
  ('Emgwen', 32, 'emgwen')
ON CONFLICT (name, county_id) DO NOTHING;

-- 33. Narok (county_id = 33)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Narok', 33, 'narok'),
  ('Kilgoris', 33, 'kilgoris'),
  ('Ololulung’a', 33, 'ololulunga'),
  ('Emali', 33, 'emali-narok'),
  ('Loita', 33, 'loita'),
  ('Narok Town', 33, 'narok-town'),
  ('Bissil', 33, 'bissil'),
  ('Naikara', 33, 'naikara')
ON CONFLICT (name, county_id) DO NOTHING;

-- 34. Nyamira (county_id = 34)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Nyamira', 34, 'nyamira-nyamira'),
  ('Keroka', 34, 'keroka'),
  ('Manga', 34, 'manga'),
  ('Kenyenya', 34, 'kenyenya'),
  ('Nyamira Town', 34, 'nyamira-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 35. Nyandarua (county_id = 35)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Ol Kalou', 35, 'ol-kalou'),
  ('Nyahururu', 35, 'nyahururu-nyandarua'),
  ('Kinangop', 35, 'kinangop'),
  ('Ol Kalou Town', 35, 'ol-kalou-town'),
  ('Njabini', 35, 'njabini'),
  ('Ndaragwa', 35, 'ndaragwa')
ON CONFLICT (name, county_id) DO NOTHING;

-- 36. Nyeri (county_id = 36)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Nyeri', 36, 'nyeri'),
  ('Karatina', 36, 'karatina'),
  ('Othaya', 36, 'othaya'),
  ('Nanyuki', 36, 'nanyuki-nyeri'),
  ('Mathira', 36, 'mathira'),
  ('Kieni', 36, 'kieni'),
  ('Chaka', 36, 'chaka'),
  ('Nyeri Town', 36, 'nyeri-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 37. Samburu (county_id = 37)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Maralal', 37, 'maralal'),
  ('Baragoi', 37, 'baragoi'),
  ('Wamba', 37, 'wamba'),
  ('Archer’s Post', 37, 'archers-post'),
  ('Suguta Marmar', 37, 'suguta-marmar'),
  ('Lodokejek', 37, 'lodokejek'),
  ('Sukutan', 37, 'sukutan')
ON CONFLICT (name, county_id) DO NOTHING;

-- 38. Siaya (county_id = 38)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Siaya', 38, 'siaya'),
  ('Bondo', 38, 'bondo'),
  ('Ugunja', 38, 'ugunja'),
  ('Ukwala', 38, 'ukwala'),
  ('Alego', 38, 'alego'),
  ('Rarieda', 38, 'rarieda'),
  ('Siaya Town', 38, 'siaya-town'),
  ('Gem', 38, 'gem')
ON CONFLICT (name, county_id) DO NOTHING;

-- 39. Taita–Taveta (county_id = 39)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Voi', 39, 'voi'),
  ('Wundanyi', 39, 'wundanyi'),
  ('Taveta', 39, 'taveta'),
  ('Mwatate', 39, 'mwatate'),
  ('Hola', 39, 'hola-taita-taveta'),
  ('Dawida', 39, 'dawida'),
  ('Mkaani', 39, 'mkaani')
ON CONFLICT (name, county_id) DO NOTHING;

-- 40. Tana River (county_id = 40)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Hola', 40, 'hola'),
  ('Garsen', 40, 'garsen'),
  ('Bura', 40, 'bura'),
  ('Kipini', 40, 'kipini'),
  ('Bangale', 40, 'bangale'),
  ('Tana Delta centres', 40, 'tana-delta-centres'),
  ('Bura Town', 40, 'bura-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 41. Tharaka–Nithi (county_id = 41)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Chuka', 41, 'chuka'),
  ('Marimanti', 41, 'marimanti'),
  ('Nkondi', 41, 'nkondi'),
  ('Itumbe', 41, 'itumbe'),
  ('Chogoria', 41, 'chogoria'),
  ('Nkubu', 41, 'nkubu'),
  ('Chuka Town', 41, 'chuka-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 42. Trans Nzoia (county_id = 42)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kitale', 42, 'kitale'),
  ('Endebess', 42, 'endebess'),
  ('Kiminini', 42, 'kiminini'),
  ('Kwanza', 42, 'kwanza'),
  ('Turbo', 42, 'turbo-trans-nzoia'),
  ('Kitale Town', 42, 'kitale-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 43. Turkana (county_id = 43)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Lodwar', 43, 'lodwar'),
  ('Kakuma', 43, 'kakuma'),
  ('Lokichoggio', 43, 'lokichoggio'),
  ('Turkana Central towns', 43, 'turkana-central-towns'),
  ('Kalokol', 43, 'kalokol'),
  ('Lomelo', 43, 'lomelo'),
  ('Lokitaung', 43, 'lokitaung')
ON CONFLICT (name, county_id) DO NOTHING;

-- 44. Uasin Gishu (county_id = 44)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Eldoret', 44, 'eldoret'),
  ('Turbo', 44, 'turbo'),
  ('Burnt Forest', 44, 'burnt-forest'),
  ('Kesses', 44, 'kesses'),
  ('Moiben', 44, 'moiben'),
  ('Soy', 44, 'soy'),
  ('Turbo Town', 44, 'turbo-town'),
  ('Eldoret Town', 44, 'eldoret-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 45. Vihiga (county_id = 45)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Mbale', 45, 'mbale'),
  ('Chavakali', 45, 'chavakali'),
  ('Vihiga Town', 45, 'vihiga-town'),
  ('Luanda', 45, 'luanda'),
  ('Emuhaya', 45, 'emuhaya'),
  ('Sabatia', 45, 'sabatia'),
  ('Maragoli centres', 45, 'maragoli-centres')
ON CONFLICT (name, county_id) DO NOTHING;

-- 46. Wajir (county_id = 46)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Wajir', 46, 'wajir'),
  ('Griftu', 46, 'griftu'),
  ('Bute', 46, 'bute'),
  ('Tarbaj', 46, 'tarbaj'),
  ('Habaswein', 46, 'habaswein'),
  ('Eldas', 46, 'eldas'),
  ('Bute Town', 46, 'bute-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 47. West Pokot (county_id = 47)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kapenguria', 47, 'kapenguria'),
  ('Makutano', 47, 'makutano-west-pokot'),
  ('Ortum', 47, 'ortum'),
  ('Kacheliba', 47, 'kacheliba'),
  ('Sigor', 47, 'sigor'),
  ('Chepareria', 47, 'chepareria'),
  ('Lomut', 47, 'lomut'),
  ('Sook', 47, 'sook')
ON CONFLICT (name, county_id) DO NOTHING;

COMMIT;


