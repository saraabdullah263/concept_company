// Test Supabase Storage Setup
// Run this in browser console after logging in

import { supabase } from './src/services/supabase';

async function testStorage() {
    console.log('🧪 Testing Supabase Storage...\n');

    // 1. Check if bucket exists
    console.log('1️⃣ Checking if bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
        console.error('❌ Error listing buckets:', bucketsError);
        return;
    }

    const bucket = buckets.find(b => b.id === 'medical-waste');
    if (bucket) {
        console.log('✅ Bucket "medical-waste" exists!');
        console.log('   - Public:', bucket.public);
        console.log('   - Created:', bucket.created_at);
    } else {
        console.log('❌ Bucket "medical-waste" NOT found!');
        console.log('📝 Available buckets:', buckets.map(b => b.id));
        console.log('\n💡 To create bucket:');
        console.log('   1. Go to Supabase Dashboard → Storage');
        console.log('   2. Click "New bucket"');
        console.log('   3. Name: medical-waste');
        console.log('   4. Enable "Public bucket"');
        console.log('   5. Click "Create"');
        return;
    }

    // 2. Test upload
    console.log('\n2️⃣ Testing file upload...');
    const testFile = new Blob(['test'], { type: 'text/plain' });
    const testPath = `test/${Date.now()}.txt`;

    const { error: uploadError } = await supabase.storage
        .from('medical-waste')
        .upload(testPath, testFile);

    if (uploadError) {
        console.error('❌ Upload failed:', uploadError.message);
        console.log('\n💡 Possible issues:');
        console.log('   - Storage policies not set');
        console.log('   - Run setup_storage.sql in SQL Editor');
    } else {
        console.log('✅ Upload successful!');

        // 3. Test public URL
        const { data: { publicUrl } } = supabase.storage
            .from('medical-waste')
            .getPublicUrl(testPath);

        console.log('✅ Public URL:', publicUrl);

        // 4. Clean up
        await supabase.storage
            .from('medical-waste')
            .remove([testPath]);
        console.log('✅ Test file cleaned up');
    }

    console.log('\n✨ Storage test complete!');
}

// Run test
testStorage();

// Export for manual use
window.testStorage = testStorage;
console.log('💡 Run testStorage() to test again');
