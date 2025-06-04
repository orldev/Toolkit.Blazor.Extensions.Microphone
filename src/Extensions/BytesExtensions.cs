using System.Buffers;

namespace Toolkit.Blazor.Extensions.Microphone.Extensions;

/// <summary>
/// Provides extension methods for byte array manipulation operations.
/// </summary>
public class BytesExtensions
{
    /// <summary>
    /// Concatenates multiple byte arrays into a single contiguous byte array.
    /// </summary>
    /// <param name="byteArrays">List of byte arrays to combine</param>
    /// <returns>A new byte array containing all input arrays concatenated together</returns>
    /// <example>
    /// <code>
    /// var chunks = new List<byte[]> { new byte[] {1, 2}, new byte[] {3, 4, 5} };
    /// byte[] combined = BytesExtensions.Unite(chunks);
    /// // combined will be {1, 2, 3, 4, 5}
    /// </code>
    /// </example>
    /// <remarks>
    /// This method efficiently combines arrays using Buffer.BlockCopy for optimal performance.
    /// The original arrays are not modified.
    /// </remarks>
    public static byte[] Unite(List<byte[]> byteArrays)
    {
        // Calculate total length
        var totalLength = byteArrays.Sum(array => array.Length);

        // Create result array
        var result = new byte[totalLength];
        var offset = 0;

        // Copy each byte array into the result
        foreach (var array in byteArrays)
        {
            Buffer.BlockCopy(array, 0, result, offset, array.Length);
            offset += array.Length;
        }

        return result;
    }
    
    /// <summary>
    /// Splits a byte array into smaller chunks of specified size.
    /// </summary>
    /// <param name="source">The source byte array to split</param>
    /// <param name="chunkSize">Maximum size of each chunk in bytes</param>
    /// <returns>An enumerable sequence of byte array chunks</returns>
    /// <example>
    /// <code>
    /// byte[] data = {1, 2, 3, 4, 5, 6, 7};
    /// var chunks = BytesExtensions.Split(data, 3);
    /// // chunks will contain {1,2,3}, {4,5,6}, {7}
    /// </code>
    /// </example>
    /// <remarks>
    /// <para>Uses ArrayPool for memory efficiency when handling large byte arrays.</para>
    /// <para>The last chunk may be smaller than the specified chunk size.</para>
    /// <para>Each chunk is rented from and returned to ArrayPool immediately after yielding.</para>
    /// <para>Callers should copy the data if they need to persist it beyond immediate use.</para>
    /// </remarks>
    public static IEnumerable<byte[]> Split(byte[] source, int chunkSize)
    {
        for (var offset = 0; offset < source.Length; offset += chunkSize)
        {
            var size = Math.Min(chunkSize, source.Length - offset);
            var chunk = ArrayPool<byte>.Shared.Rent(size);
            Buffer.BlockCopy(source, offset, chunk, 0, size);
            yield return chunk;
            ArrayPool<byte>.Shared.Return(chunk);
        }
    }
}